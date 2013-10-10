var PTM = Backbone.Model.extend({
	"defaults" : {
		"url" : null,
		"docId" : null,
		"segmentIds" : [],
		"segments" : {},
		"sourceMatchedTokens" : {},    // @value {{segmentId:{number:true}}} Can be modified by SourceState on a "updateMatchedSourceTokens" event.
		"highlightSegmentId" : null,   // @value {segmentId|null} Can be modified by SourceView on a "mouseOver" or "mouseOut" event.
		"highlightTokenIndex" : null,  // @value {integer|null} Can be modified by SourceView on a "mouseOver" or "mouseOut" event.
		"highlightSource" : "",        // @value {string} Can be modified by SourceView on a "mouseOver" or "mouseOut" event.
		"highlightTargets" : [],       // @value {string[]} Modified at the completion of a loadWordQueries() request, following a SourceView "mouseOver" or "mouseOut" event.
		"highlightXCoord" : 0,         // @value {number} Can be modified by SourceView on a "mouseOver" or "mouseOut" event.
		"highlightYCoord" : 0,         // @value {number} Can be modified by SourceView on a "mouseOver" or "mouseOut" event.
		"typingUserText" : {},         // @value {{segmentId:string}} Can be modified by TargetView on an "updateUserText" event.
		"typingCaretIndex" : {},       // @value {{segmentId:integer}} Can be modified by TargetView on an "updateUserText" event.
		"typingPrefix" : {},           // @value {{segmentId:string}} Can be modified by TargetView on an "updateTranslations" event.
		"typingTranslationList" : {},  // @value {{segmentId:string[]}} Modified at the completion of a loadTranslations() request, following a TargetView "updateTranslations" event.
		"typingAlignIndexList" : {},   // @value {{segmentId:string[]}} Modified at the completion of a loadTranslations() request, following a TargetView "updateTranslations" event.
		"typingChunkIndexList" : {},   // @value {{segmentId:string[]}} Modified at the completion of a loadTranslations() request, following a TargetView "updateTranslations" event.
		"typingFocus" : null,          // @value {segmentId} Can be modified by a focusOnSegment() or focusOnNextSegment() call.
		"suggestionSegmentId" : null,  // @value {string} Can be modified by TargetView on a "updateAutocomplete" event.
		"suggestionChunkIndex" : null, // @value {string} Can be modified by TargetView on a "updateAutocomplete" event.
		"suggestionCandidates" : [],   // @value {string} Can be modified by TargetView on a "updateAutocomplete" event.
		"suggestionXCorod" : 0,        // @value {string} Can be modified by TargetView on a "updateAutocomplete" event.
		"suggestionYCoord" : 0,        // @value {string} Can be modified by TargetView on a "updateAutocomplete" event.
		"mouseXCoord" : 0,
		"mouseYCoord" : 0
	},
	"url" : function() {
		return this.get( "url" );
	}
});

/**
 * @param {Object} options Options must contain a field 'url' specifying the location of the PTM data.
 **/
PTM.prototype.initialize = function( options ) {
	this.server = new TranslateServer();
	this.sourceSuggestionState = null;
	this.sourceSuggestionView = null;
	this.sourceStates = {};
	this.sourceViews = {};
	this.targetStates = {};
	this.targetViews = {};
	this.cache = {};
	this.cache.wordQueries = {};
	this.cache.translations = {};
	
	// Define debounced methods
	this.showSourceSuggestions = _.debounce( this.__showSourceSuggestions, 10 );
	this.showTargetSuggestions = _.debounce( this.__showTargetSuggestions, 10 );
	
	this.fetch({ success : this.loaded.bind(this) });
};

PTM.prototype.loaded = function() {
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
		return segment;
	}.bind(this);
	var getSegmentTokens = function( segment ) {
		return segment.tokens;
	}.bind(this);
	var getSegmentChunkIndexes = function( segment ) {
		return segment.chunkIndexes;
	}.bind(this);
	
	// Post-process segments received from the MT server
	var segmentIds = this.get( "segmentIds" );
	var segments = this.get( "segments" );
	for ( var i = 0; i < segmentIds.length; i++ ) {
		var segmentId = segmentIds[i];
		var segment = segments[segmentId];
		segment = amendSegmentChunkIndexes( segment );
	}
	
	// Create source boxes and typing UIs
	var container = d3.select( "#PTM" );
	for ( var i = 0; i < segmentIds.length; i++ ) {
		var segmentId = segmentIds[i];

		// Generate HTML DOM elements
		container.append( "div" ).attr( "class", "SourceView SourceView" + segmentId );
		container.append( "div" ).attr( "class", "TargetView TargetView" + segmentId );
		
		// Create state and view objects for the source box
		var sourceState = new SourceState();
		var sourceView = new SourceView({ "model" : sourceState, "el" : ".SourceView" + segmentId });
		this.sourceStates[segmentId] = sourceState;
		this.sourceViews[segmentId] = sourceView;
		this.listenTo( sourceView, "mouseOver", this.showSourceSuggestions );
		this.listenTo( sourceView, "mouseOut", this.showSourceSuggestions );
		var segmentTokens = getSegmentTokens( segments[ segmentId ] );
		this.get( "sourceMatchedTokens" )[ segmentId ] = {};
		sourceState.set({
			"segmentId" : segmentId,
			"tokens" : segmentTokens
		});
		
		// Create state and view objects for the typing UI
		var targetState = new TargetState();
		var targetView = new TargetView({ "model" : targetState, "el" : ".TargetView" + segmentId });
		this.targetStates[segmentId] = targetState;
		this.targetViews[segmentId] = targetView;
		this.listenTo( targetState, "updateTranslations", this.loadTranslations );
		this.listenTo( targetState, "updateMatchedSourceTokens", this.updateMatchedSourceTokens );
		this.listenTo( targetState, "updateAutocompleteCandidates", this.showTargetSuggestions );
		this.listenTo( targetView, "keyPress:enter", this.focusOnNextSegment );
		this.listenTo( targetView, "keyPress:shift:enter", this.focusOnPreviousSegment );
		this.listenTo( targetView, "keyPress:-", this.updateUserText );
		this.get( "typingUserText" )[ segmentId ] = "";
		this.get( "typingPrefix" )[ segmentId ] = "";
		this.get( "typingTranslationList" )[ segmentId ] = [];
		this.get( "typingChunkIndexList" )[ segmentId ] = [];
		this.get( "typingCaretIndex" )[ segmentId ] = 0;
		this.cache.translations[ segmentId ] = {};
		targetState.set({
			"segmentId" : segmentId
		});
		this.updateUserText( segmentId, "", 0 );
		this.loadTranslations( segmentId, "" );
	}

	// Create highlight object (i.e., floating menu showing word query results when a user hovers over a word in the source language)
	this.sourceSuggestionState = new SourceSuggestionState();
	this.sourceSuggestionView = new SourceSuggestionView({ "model" : this.sourceSuggestionState });
	this.listenTo( this.sourceSuggestionView, "mouseOver", this.showSourceSuggestions );
	this.listenTo( this.sourceSuggestionView, "mouseOut", this.showSourceSuggestions );
	this.listenTo( this.sourceSuggestionView, "mouseOverOption", function(){} );
	this.listenTo( this.sourceSuggestionView, "mouseOutOption", function(){} );
	this.listenTo( this.sourceSuggestionView, "mouseClickOption", function(){} );
	this.cache.wordQueries[ "" ] = { "rules" : [] };
	this.showSourceSuggestions( null, null );

	// Create suggestion object (i.e., floating menu showing updateAutocomplete options when a user is typing in the target language)
	this.targetSuggestionState = new TargetSuggestionState();
	this.targetSuggestionView = new TargetSuggestionView({ "model" : this.targetSuggestionState });
	this.listenTo( this.targetSuggestionView, "mouseOver", this.showTargetSuggestions );
	this.listenTo( this.targetSuggestionView, "mouseOut", this.showTargetSuggestions );
	this.listenTo( this.targetSuggestionView, "mouseOverOption", function(){} );
	this.listenTo( this.targetSuggestionView, "mouseOutOption", function(){} );
	this.listenTo( this.targetSuggestionView, "mouseClickOption", function(){} );
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
	});
	
	// Propagate states to source text objects
	for ( var i = 0; i < segmentIds.length; i++ ) {
		var segmentId = segmentIds[ i ];
		this.sourceStates[ segmentId ].set({
			"hoverTokenIndex" : ( segmentId === highlightSegmentId ) ? highlightTokenIndex : null
		});
	}
	
	// Propagate states to the source suggestion box, and make word query request (if necessary)
	this.sourceSuggestionState.set({
		"segmentId" : highlightSegmentId,
		"tokenIndex" : highlightTokenIndex,
		"source" : highlightSource,
		"targets" : [],
		"xCoord" : highlightXCoord,
		"yCoord" : highlightYCoord
	});
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
	
	// Update PTM states
	this.set({
		"suggestionSegmentId" : suggestionSegmentId,
		"suggestionChunkIndex" : suggestionChunkIndex,
		"suggestionCandidates" : suggestionCandidates,
		"suggestionXCoord" : suggestionXCoord,
		"suggestionYCoord" : suggestionYCoord
	});
	
	// Propagate states to the target suggestion box
	this.targetSuggestionState.set({
		"segmentId" : suggestionSegmentId,
		"chunkIndex" : suggestionChunkIndex,
		"candidates" : suggestionCandidates,
		"xCoord" : suggestionXCoord,
		"yCoord" : suggestionYCoord
	});
};

PTM.prototype.updateMatchedSourceTokens = function( segmentId, matchedTokenIndexes ) {
	this.get( "sourceMatchedTokens" )[ segmentId ] = matchedTokenIndexes;
	this.sourceStates[ segmentId ].set( "matchedTokenIndexes", matchedTokenIndexes );
};

PTM.prototype.updateUserText = function( segmentId, userText, caretIndex ) {
	this.get( "typingUserText" )[ segmentId ] = userText;
	this.get( "typingCaretIndex" )[ segmentId ] = caretIndex;
	this.targetStates[ segmentId ].setUserText( userText, caretIndex );
};

PTM.prototype.insertToken = function( segmentId, token ) {
	console.log( "[click-and-insert]", segmentId, token );
};

PTM.prototype.focusOnSegment = function( typingFocus ) {
	this.set( "typingFocus", typingFocus );
	var segmentIds = this.get( "segmentIds" );
	for ( var i = 0; i < segmentIds.length; i++ ) {
		var segmentId = segmentIds[i];
		this.targetStates[ segmentId ].setFocus( typingFocus === segmentId );
	}
};

PTM.prototype.focusOnNextSegment = function() {
	var typingFocus = this.get( "typingFocus" );
	var segmentIds = this.get( "segmentIds" );
	var index = segmentIds.indexOf( typingFocus );
	var typingNewFocus = segmentIds[ ( index + 1 ) % segmentIds.length ];
	this.focusOnSegment( typingNewFocus );
};

PTM.prototype.focusOnPreviousSegment = function() {
	var typingFocus = this.get( "typingFocus" );
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
	var getTranslationList = function( response ) {
		if ( response.hasOwnProperty( "translationList" ) ) {
			return response.translationList;
		}
		return [];
	}.bind(this);
	var getAlignIndexList = function( response ) {
		if ( response.hasOwnProperty( "alignIndexList" ) ) {
			return response.alignIndexList;
		}
		return [];
	}.bind(this);
	var getChunkIndexList = function( response ) {
		if ( response.hasOwnProperty( "chunkIndexList" ) ) {
			return response.chunkIndexList;
		}
		return [];
	}.bind(this);
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
			var translationList = getTranslationList( response );
			var alignIndexList = getAlignIndexList( response );
			var chunkIndexList = getChunkIndexList( response );
			this.set( "typingTranslationList" )[ segmentId ] = translationList;
			this.set( "typingAlignIndexList" )[ segmentId ] = alignIndexList;
			this.set( "typingChunkIndexList" )[ segmentId ] = chunkIndexList;
			this.targetStates[ segmentId ].setTranslations( prefix, translationList, alignIndexList, chunkIndexList );
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
