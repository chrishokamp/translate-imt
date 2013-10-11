var PTM = Backbone.Model.extend({
	"defaults" : {
		"url" : null,
		"docId" : null,
		"segmentIds" : [],
		"segments" : {},
		"sourceMatchedTokens" : {},    // @value {{segmentId:{number:true}}} Can be modified by SourceBoxState on a "updateMatchedSourceTokens" event.
		"highlightSegmentId" : null,   // @value {segmentId|null} Can be modified by SourceBoxView on a "mouseOver" or "mouseOut" event.
		"highlightTokenIndex" : null,  // @value {integer|null} Can be modified by SourceBoxView on a "mouseOver" or "mouseOut" event.
		"highlightSource" : "",        // @value {string} Can be modified by SourceBoxView on a "mouseOver" or "mouseOut" event.
		"highlightTargets" : [],       // @value {string[]} Modified at the completion of a loadWordQueries() request, following a SourceBoxView "mouseOver" or "mouseOut" event.
		"highlightXCoord" : 0,         // @value {number} Can be modified by SourceBoxView on a "mouseOver" or "mouseOut" event.
		"highlightYCoord" : 0,         // @value {number} Can be modified by SourceBoxView on a "mouseOver" or "mouseOut" event.
		"typingUserText" : {},         // @value {{segmentId:string}} Can be modified by TargetTypingView on an "updateUserText" event.
		"typingCaretIndex" : {},       // @value {{segmentId:integer}} Can be modified by TargetTypingView on an "updateUserText" event.
		"typingPrefix" : {},           // @value {{segmentId:string}} Can be modified by TargetTypingView on an "updateTranslations" event.
		"typingTranslationList" : {},  // @value {{segmentId:string[]}} Modified at the completion of a loadTranslations() request, following a TargetTypingView "updateTranslations" event.
		"typingAlignIndexList" : {},   // @value {{segmentId:string[]}} Modified at the completion of a loadTranslations() request, following a TargetTypingView "updateTranslations" event.
		"typingChunkIndexList" : {},   // @value {{segmentId:string[]}} Modified at the completion of a loadTranslations() request, following a TargetTypingView "updateTranslations" event.
		"typingFocus" : null,          // @value {segmentId} Can be modified by a focusOnSegment() or focusOnNextSegment() call.
		"suggestionSegmentId" : null,  // @value {string} Can be modified by TargetTypingView on a "updateAutocomplete" event.
		"suggestionChunkIndex" : null, // @value {string} Can be modified by TargetTypingView on a "updateAutocomplete" event.
		"suggestionCandidates" : [],   // @value {string} Can be modified by TargetTypingView on a "updateAutocomplete" event.
		"suggestionXCorod" : 0,        // @value {string} Can be modified by TargetTypingView on a "updateAutocomplete" event.
		"suggestionYCoord" : 0,        // @value {string} Can be modified by TargetTypingView on a "updateAutocomplete" event.
		"mouseXCoord" : 0,
		"mouseYCoord" : 0
	},
	"url" : function() {
		return this.get( "url" );
	}
});

/**
 * Default Backbone initialization call.
 * @override
 * @param {Object} options Options must contain a field 'url' specifying the location of the PTM data.
 **/
PTM.prototype.initialize = function( options ) {

	// Define or create a stub for all models and views.
	/** @param {TranslateServer} **/
	this.server = new TranslateServer();
	/** @param {{segmentId:SourceBoxState}} **/
	this.sourceBoxStates = {};
	/** @param {{segmentId:SourceBoxView}} **/
	this.sourceBoxViews = {};
	/** @param {SourceSuggestionState} **/
	this.sourceSuggestionState = null;
	/** @param {SourceSuggestionView} **/
	this.sourceSuggestionView = null;
	/** @param {{segmentId:TargetTypingState}} **/
	this.targetTypingStates = {};
	/** @param {{segmentId:TargetTypingView}} **/
	this.targetTypingViews = {};
	/** @param {TargetSuggestionState} **/
	this.targetSuggestionState = null;
	/** @param {TargetSuggestionView} **/
	this.targetSuggestionView = null;
	
	// Define cache for a cache for storing rqReq and tReq results
	this.cache = {};
	/** @param {{string:Object}} Cache for storing rqReq results, indexed by word. **/
	this.cache.wordQueries = {};
	/** @param {{segmentId:{string:Object}}} Cache for storing tReq results, indexed by segmentId and then by prefix. **/
	this.cache.translations = {};

	// Define debounced methods
	/** @param {function} Display the source suggestion (word lookup) floating menu. The menu is refreshed at most every 10ms. **/
	this.showSourceSuggestions = _.debounce( this.__showSourceSuggestions, 10 );
	/** @param {function} Display the target suggestion (autocomplete) floating menu. The menu is refreshed at most every 10ms. **/
	this.showTargetSuggestions = _.debounce( this.__showTargetSuggestions, 10 );
	
	this.fetch({ success : this.loaded.bind(this) });
};

/**
 * Post-process segments received from the MT server.
 * TODO: Push post-processing onto server?
 * @private
 **/
PTM.prototype.loaded = function() {
	/**
	 * Combine consecutive tokens marked as 'isBaseNP' into a chunk.
	 * Assigned a unique index to each chunk.
	 * @prviate
	 **/
	var amendSegmentChunkIndexes = function( segment ) {
		var chunkIndexes = [];
		var chunkIndex = 0;
		var baseNP = null;
		for ( var i = 0; i < segment.isBaseNP.length; i++ ) {
			chunkIndexes.push( chunkIndex );
			if ( baseNP !== segment.isBaseNP[i] || baseNP === false || segment.isBaseNP[i] === false ) {
				baseNP = segment.isBaseNP[i];
				chunkIndex++;
			}
		}
		segment.chunkIndexes = chunkIndexes;
	}.bind(this);
	var segments = this.get( "segments" );
	for ( var segmentId in segments ) {
		segment = amendSegmentChunkIndexes( segments[segmentId] );
	}
	this.setup();
};

/**
 * Controller for the Predictive Translate Memory
 **/
PTM.prototype.setup = function() {
	var segmentIds = this.get( "segmentIds" );
	var segments = this.get( "segments" );
	
	// Create source boxes and typing UIs
	var container = d3.select( "#PTM" );
	for ( var i = 0; i < segmentIds.length; i++ ) {
		var segmentId = segmentIds[i];

		// Generate HTML DOM elements
		container.append( "div" ).attr( "class", "SourceBoxView SourceBoxView" + segmentId );
		container.append( "div" ).attr( "class", "TargetTypingView TargetTypingView" + segmentId );
		
		// Create a SourceBox (matching pair of state and view) for each segment
		var sourceBoxState = new SourceBoxState();
		var sourceBoxView = new SourceBoxView({ "model" : sourceBoxState, "el" : ".SourceBoxView" + segmentId });
		this.sourceBoxStates[segmentId] = sourceBoxState;
		this.sourceBoxViews[segmentId] = sourceBoxView;
		this.listenTo( sourceBoxView, "mouseOver:token", this.showSourceSuggestions );
		this.listenTo( sourceBoxView, "mouseOut:token", this.showSourceSuggestions );
		this.get( "sourceMatchedTokens" )[ segmentId ] = {};
		sourceBoxState.set({
			"segmentId" : segmentId,
			"tokens" : segments[ segmentId ].tokens
		});
		
		// Create state and view objects for the typing UI
		var targetTypingState = new TargetTypingState();
		var targetTypingView = new TargetTypingView({ "model" : targetTypingState, "el" : ".TargetTypingView" + segmentId });
		this.targetTypingStates[segmentId] = targetTypingState;
		this.targetTypingViews[segmentId] = targetTypingView;
		this.listenTo( targetTypingState, "updateTranslations", this.loadTranslations );
		this.listenTo( targetTypingState, "updateMatchedSourceTokens", this.updateMatchedSourceTokens );
		this.listenTo( targetTypingState, "updateAutocompleteCandidates", this.showTargetSuggestions );
		this.listenTo( targetTypingView, "mouseDown:*", this.focusOnSegment );
		this.listenTo( targetTypingView, "keyPress:enter", this.focusOnNextSegment );
		this.listenTo( targetTypingView, "keyPress:enter+shift", this.focusOnPreviousSegment );
		this.listenTo( targetTypingView, "keyPress:tab", this.replaceActiveTokens );
		this.listenTo( targetTypingView, "keyPress:*", this.updateUserText );
		this.get( "typingUserText" )[ segmentId ] = "";
		this.get( "typingPrefix" )[ segmentId ] = "";
		this.get( "typingTranslationList" )[ segmentId ] = [];
		this.get( "typingChunkIndexList" )[ segmentId ] = [];
		this.get( "typingCaretIndex" )[ segmentId ] = 0;
		this.cache.translations[ segmentId ] = {};
		targetTypingState.set({
			"segmentId" : segmentId
		});
		this.updateUserText( segmentId, "", 0 );
		this.loadTranslations( segmentId, "" );
	}

	// Create highlight object (i.e., floating menu showing word query results when a user hovers over a word in the source language)
	this.sourceSuggestionState = new SourceSuggestionState();
	this.sourceSuggestionView = new SourceSuggestionView({ "model" : this.sourceSuggestionState });
	this.listenTo( this.sourceSuggestionView, "mouseOver:*", this.showSourceSuggestions );
	this.listenTo( this.sourceSuggestionView, "mouseOut:*", this.showSourceSuggestions );
	this.listenTo( this.sourceSuggestionView, "mouseOver:option", function(){} );
	this.listenTo( this.sourceSuggestionView, "mouseOut:option", function(){} );
	this.listenTo( this.sourceSuggestionView, "mouseClick:option", this.replaceCaretToken );
	this.cache.wordQueries[ "" ] = { "rules" : [] };
	this.showSourceSuggestions( null, null );

	// Create suggestion object (i.e., floating menu showing updateAutocomplete options when a user is typing in the target language)
	this.targetSuggestionState = new TargetSuggestionState();
	this.targetSuggestionView = new TargetSuggestionView({ "model" : this.targetSuggestionState });
	this.listenTo( this.targetSuggestionView, "mouseOver:*", this.showTargetSuggestions );
//	this.listenTo( this.targetSuggestionView, "mouseOut:*", this.showTargetSuggestions );
	this.listenTo( this.targetSuggestionView, "mouseOver:option", function(){} );
	this.listenTo( this.targetSuggestionView, "mouseOut:option", function(){} );
	this.listenTo( this.targetSuggestionView, "mouseClick:option", this.replaceActiveTokens );
	this.showTargetSuggestions( null, null );

	// Focus on the first segment
	var typingFocus = segmentIds[0];
	this.focusOnSegment( typingFocus );
};

/**
 * @param {string} highlightSegmentId
 * @param {integer} highlightTokenIndex
 * @param {number} [highlightXCoord]
 * @param {number} [highlightYCoord]
 * @private
 **/
PTM.prototype.__showSourceSuggestions = function( highlightSegmentId, highlightTokenIndex, highlightXCoord, highlightYCoord ) {
	if ( highlightSegmentId === undefined ) { highlightSegmentId = null }
	if ( highlightTokenIndex === undefined ) { highlightTokenIndex = null }
	if ( highlightXCoord === undefined ) { highlightXCoord = 0 }
	if ( highlightYCoord === undefined ) { highlightYCoord = 0 }
	var segmentIds = this.get( "segmentIds" );
	var segments = this.get( "segments" );
	var highlightSource = ( highlightSegmentId !== null && highlightTokenIndex !== null ) ? segments[ highlightSegmentId ].tokens[ highlightTokenIndex ] : "";
	
	// Update PTM states
	this.set({
		"highlightSegmentId" : highlightSegmentId,
		"highlightTokenIndex" : highlightTokenIndex,
		"highlightSource" : highlightSource,
		"highlightTargets" : [],
		"highlightXCoord" : highlightXCoord,
		"highlightYCoord" : highlightYCoord
	}, {trigger:true});
	
	// Propagate states to SourceBoxes
	for ( var i = 0; i < segmentIds.length; i++ ) {
		var segmentId = segmentIds[ i ];
		this.sourceBoxStates[ segmentId ].set({
			"hoverTokenIndex" : ( segmentId === highlightSegmentId ) ? highlightTokenIndex : null
		}, {trigger:true});
	}
	
	// Propagate states to the SourceSuggestions, and make a word query request (if necessary)
	this.sourceSuggestionState.set({
		"segmentId" : highlightSegmentId,
		"tokenIndex" : highlightTokenIndex,
		"source" : highlightSource,
		"targets" : [],
		"xCoord" : highlightXCoord,
		"yCoord" : highlightYCoord
	}, {trigger:true});
	this.loadWordQueries( highlightSource );
};

/**
 * @param {string} suggestionSegmentId
 * @param {integer} suggestionChunkIndex
 * @param {string[]} [suggestionCandidates]
 * @param {number} [suggestionXCoord]
 * @param {number} [suggestionYCoord]
 * @private
 **/
PTM.prototype.__showTargetSuggestions = function( suggestionSegmentId, suggestionChunkIndex, suggestionCandidates, suggestionXCoord, suggestionYCoord ) {
	if ( suggestionSegmentId === undefined ) { suggestionSegmentId = null }
	if ( suggestionChunkIndex === undefined ) { suggestionChunkIndex = null }
	if ( suggestionCandidates === undefined ) { suggestionCandidates = [] }
	if ( suggestionXCoord === undefined ) { suggestionXCoord = 0 }
	if ( suggestionYCoord === undefined ) { suggestionYCoord = 0 }
	console.log( suggestionSegmentId, suggestionChunkIndex, suggestionCandidates, suggestionXCoord, suggestionYCoord )
	
	// Update PTM states
	this.set({
		"suggestionSegmentId" : suggestionSegmentId,
		"suggestionChunkIndex" : suggestionChunkIndex,
		"suggestionCandidates" : suggestionCandidates,
		"suggestionXCoord" : suggestionXCoord,
		"suggestionYCoord" : suggestionYCoord
	}, {trigger:true});
	
	// Propagate states to TargetSuggestions
	this.targetSuggestionState.set({
		"segmentId" : suggestionSegmentId,
		"chunkIndex" : suggestionChunkIndex,
		"candidates" : suggestionCandidates,
		"xCoord" : suggestionXCoord,
		"yCoord" : suggestionYCoord
	}, {trigger:true});
};

PTM.prototype.updateMatchedSourceTokens = function( segmentId, matchedTokenIndexes ) {
	console.log( "updateMatchedSourceTokens", segmentId, matchedTokenIndexes );
	this.get( "sourceMatchedTokens" )[ segmentId ] = matchedTokenIndexes;
	this.sourceBoxStates[ segmentId ].set( "matchedTokenIndexes", matchedTokenIndexes );
};

PTM.prototype.updateUserText = function( segmentId, userText, caretIndex ) {
	var targetTypingState = this.targetTypingStates[ segmentId ];
	this.get( "typingUserText" )[ segmentId ] = userText;
	this.get( "typingCaretIndex" )[ segmentId ] = caretIndex;
	targetTypingState.setUserText( userText, caretIndex );
};

PTM.prototype.replaceCaretToken = function( segmentId, text ) {
	var targetTypingState = this.targetTypingStates[ segmentId ];
	var userText = targetTypingState.replaceCaretToken( text );
	var caretIndex = userText.length;
	this.get( "typingUserText" )[ segmentId ] = userText;
	this.get( "typingCaretIndex" )[ segmentId ] = caretIndex;
	targetTypingState.setUserText( userText, caretIndex );
};
PTM.prototype.replaceActiveTokens = function( segmentId, text ) {
	var targetTypingState = this.targetTypingStates[ segmentId ];
	var userText = targetTypingState.replaceActiveTokens( text );
	var caretIndex = userText.length;
	this.get( "typingUserText" )[ segmentId ] = userText;
	this.get( "typingCaretIndex" )[ segmentId ] = caretIndex;
	targetTypingState.setUserText( userText, caretIndex );
};

PTM.prototype.focusOnSegment = function( typingFocus ) {
	this.set( "typingFocus", typingFocus );
	var segmentIds = this.get( "segmentIds" );
	for ( var i = 0; i < segmentIds.length; i++ ) {
		var segmentId = segmentIds[i];
		this.sourceBoxStates[ segmentId ].set({ "hasFocus" : typingFocus === segmentId });
		this.targetTypingStates[ segmentId ].setFocus( typingFocus === segmentId );
	}
};

PTM.prototype.focusOnNextSegment = function( typingFocus ) {
	var segmentIds = this.get( "segmentIds" );
	var index = segmentIds.indexOf( typingFocus );
	var typingNewFocus = segmentIds[ ( index + 1 ) % segmentIds.length ];
	this.focusOnSegment( typingNewFocus );
};

PTM.prototype.focusOnPreviousSegment = function( typingFocus ) {
	var segmentIds = this.get( "segmentIds" );
	var index = segmentIds.indexOf( typingFocus );
	var typingNewFocus = segmentIds[ ( index + segmentIds.length - 1 ) % segmentIds.length ];
	this.focusOnSegment( typingNewFocus );
};

PTM.prototype.loadWordQueries = function( source ) {
	var getTargetTerms = function( response ) {
		if ( response.hasOwnProperty( "rules" ) ) {
			return response.rules.map( function(d) { return d.tgt } );
		}
		return [];
	}.bind(this);
	var update = function( response ) {
		if ( this.get( "highlightSource" ) === source ) {
			var targets = getTargetTerms( response );
			this.set({
				"highlightTargets" : targets
			});
			this.sourceSuggestionState.set({
				"targets" : targets
			});
		}
	}.bind(this);
	var cacheAndUpdate = function( response, request ) {
		this.cache.wordQueries[ source ] = response;
		update( response );
	}.bind(this);
	if ( this.cache.wordQueries.hasOwnProperty( source ) ) {
		update( this.cache.wordQueries[ source ] );
	}
	else {
		this.server.wordQuery( source, cacheAndUpdate );
	}
};

PTM.prototype.loadTranslations = function( segmentId, prefix ) {
	this.get( "typingPrefix" )[ segmentId ] = prefix;
	
	/**
	 * Convert machine translation from a string to a list of tokens.
	 * TODO: Push post-processing onto server?
	 * @private
	 **/
	var amendTranslationTokens = function( response ) {
		if ( response.hasOwnProperty( "tgtList" ) ) {
			var translationList = [];
			for ( var n = 0; n < response.tgtList.length; n++ ) {
				var translationTokens = response.tgtList[n].split( /[ ]+/g );
				translationList.push( translationTokens );
			}
			response.translationList = translationList;
		}
		return response;
	}.bind(this);
	/**
	 * Convert alignment indexes ("alignList") from a string to a list of {sourceIndex:number, targetIndex:number} entries ("alignIndexList").
	 * TODO: Push post-processing onto server?
	 * @private
	 **/
	var amendAlignIndexes = function( response ) {
		if ( response.hasOwnProperty( "alignList" ) ) {
			var alignIndexList = [];
			for ( var n = 0; n < response.alignList.length; n++ ) {
				var alignStrs = response.alignList[n].split(" ");
				var alignIndexes = alignStrs.map( function(d) { 
					var st = d.split("-").map( function(d) { return parseInt(d) } );
					return { "sourceIndex" : st[0], "targetIndex" : st[1] };
				});
				alignIndexList.push( alignIndexes );
			}
			response.alignIndexList = alignIndexList;
		}
		return response;
	}.bind(this);
	/**
	 * Match each token in every machine translation to a chunk index in the source text.
	 * TODO: Push post-processing onto server?
	 * @private
	 **/
	var amendChunkIndexes = function( response ) {
		var segments = this.get( "segments" );
		var segment = segments[ segmentId ];
		var segmentChunkIndexes = segment.chunkIndexes;
		if ( response.hasOwnProperty( "alignIndexList" ) ) {
			var chunkIndexList = [];
			for ( var n = 0; n < response.alignIndexList.length; n++ ) {
				var alignIndexes = response.alignIndexList[n];
				var chunkIndexes = _.range( response.translationList[n].length ).map( function(d) { return null } );
				for ( var i = alignIndexes.length - 1; i >= 0; i-- ) {
					var alignIndex = alignIndexes[i];
					var chunkIndex = segmentChunkIndexes[ alignIndex.sourceIndex ];
					chunkIndexes[ alignIndex.targetIndex ] = chunkIndex;
				}
				chunkIndexList.push( chunkIndexes );
			}
			response.chunkIndexList = chunkIndexList;
		}
		return response;
	}.bind(this);
	var update = function( response ) {
		if ( this.get( "typingPrefix" )[ segmentId ] === prefix ) {
			var translationList = response.translationList;
			var alignIndexList = response.alignIndexList;
			var chunkIndexList = response.chunkIndexList;
			this.set( "typingTranslationList" )[ segmentId ] = translationList;
			this.set( "typingAlignIndexList" )[ segmentId ] = alignIndexList;
			this.set( "typingChunkIndexList" )[ segmentId ] = chunkIndexList;
			this.targetTypingStates[ segmentId ].setTranslations( prefix, translationList, alignIndexList, chunkIndexList );
		}
	}.bind(this);
	var cacheAndUpdate = function( response, request ) {
		response = amendTranslationTokens( response );
		response = amendAlignIndexes( response );
		response = amendChunkIndexes( response );
		this.cache.translations[ segmentId ][ prefix ] = response;
		update( response );
	}.bind(this);
	if ( this.cache.translations[ segmentId ].hasOwnProperty( prefix ) ) {
		if ( this.cache.translations[ segmentId ][ prefix ] !== null ) {
			update( this.cache.translations[ segmentId ][ prefix ] );  // Otherwise request has already been sent
		}
	}
	else {
		var segments = this.get( "segments" );
		var source = segments[ segmentId ].tokens.join( " " );
		this.cache.translations[ segmentId ][ prefix ] = null;
		this.server.translate( source, prefix, cacheAndUpdate );
	}
};
