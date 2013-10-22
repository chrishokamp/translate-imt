var PTM = Backbone.Model.extend({
	"url" : function() {
		return this.get( "url" );
	}
});

PTM.prototype.load = function( url ) {
	this.reset();
	this.set( "url", url );
	this.fetch({ success : this.loaded.bind(this) });
};

PTM.prototype.reset = function() {
	this.set({
		"url" : null,
		"docId" : null,
		"segmentIds" : [],
		"segments" : {},
		"targetUserText" : {},         // @value {{segmentId:string}} Can be modified by TargetTypingView on an "updateUserText" event.
		"targetCaretIndex" : {},       // @value {{segmentId:integer}} Can be modified by TargetTypingView on an "updateUserText" event.
		"targetPrefix" : {},           // @value {{segmentId:string}} Can be modified by TargetTypingView on an "updateTranslations" event.
		"targetTranslationList" : {},  // @value {{segmentId:string[]}} Modified at the completion of a loadTranslations() request, following a TargetTypingView "updateTranslations" event.
		"targetAlignIndexList" : {},   // @value {{segmentId:string[]}} Modified at the completion of a loadTranslations() request, following a TargetTypingView "updateTranslations" event.
		"targetChunkIndexList" : {},   // @value {{segmentId:string[]}} Modified at the completion of a loadTranslations() request, following a TargetTypingView "updateTranslations" event.
		"targetFocus" : null,          // @value {segmentId} Can be modified by a focusOnSegment() or focusOnNextSegment() call.
		"suggestionSegmentId" : null,  // @value {string} Can be modified by TargetTypingView on a "updateAutocomplete" event.
		"suggestionChunkIndex" : null, // @value {string} Can be modified by TargetTypingView on a "updateAutocomplete" event.
		"suggestionCandidates" : [],   // @value {string} Can be modified by TargetTypingView on a "updateAutocomplete" event.
		"suggestionXCorod" : 0,        // @value {string} Can be modified by TargetTypingView on a "updateAutocomplete" event.
		"suggestionYCoord" : 0,        // @value {string} Can be modified by TargetTypingView on a "updateAutocomplete" event.
		"mouseXCoord" : 0,
		"mouseYCoord" : 0
	});

	// Define or create a stub for all models and views.
	/** @param {TranslateServer} **/
	this.server = new TranslateServer();
	
	/** @param {DocumentView} **/
	this.documentView = null;
	this.sourceBoxes = {};
	this.sourceSuggestions = {};
	this.targetBoxes = {};
	this.targetSuggestions = {};
	
	// Define cache for a cache for storing rqReq and tReq results
	this.cache = {};
	/** @param {{string:Object}} Cache for storing rqReq results, indexed by word. **/
	this.cache.wordQueries = { ":" : { "rules" : [] } };
	/** @param {{segmentId:{string:Object}}} Cache for storing tReq results, indexed by segmentId and then by prefix. **/
	this.cache.translations = {};

	// Define debounced methods
	/** @param {function} Display the source suggestion (word lookup) floating menu. The menu is refreshed at most every 10ms. **/
	this.showSourceSuggestions = _.debounce( this.__showSourceSuggestions, 10 );
};

/**
 * Post-process segments received from the MT server.
 * TODO: Push post-processing onto server?
 * @private
 **/
PTM.prototype.loaded = function() {
	/**
	 * Combine consecutive tokens marked as 'chunkIOB' into a chunk.
	 * Assign a unique index to each chunk.
	 * @private
	 **/
	var amendSegmentChunkIndexes = function( segment ) {
		var chunkIndexes = [];
		var chunkIndex = 0;
		var insideChunk = false;
		for ( var i = 0; i < segment.chunkIOB.length; i++ ) {
			if (segment.chunkIOB[i] === "B") {
				chunkIndex++;
				insideChunk = true;
			} else if (segment.chunkIOB[i] === "O" && insideChunk) {
				chunkIndex++;
				insideChunk = false;
			}
			chunkIndexes.push( chunkIndex );
		}
		segment.chunkIndexes = chunkIndexes;
	}.bind(this);
	
	var segments = this.get( "segments" );
	var segmentIds = _.keys( segments ).sort( function(a,b) { return parseInt(a) - parseInt(b) } );
	segmentIds.forEach( function(segmentId) {
		amendSegmentChunkIndexes( segments[segmentId] );
	}.bind(this) );
	this.set( "segmentIds", segmentIds );
	this.setup();
};

/**
 * Controller for the Predictive Translate Memory
 **/
PTM.prototype.setup = function() {
	var container = d3.select( "#PTM" );
	container.selectAll( "*" ).remove();
	
	var segments = this.get( "segments" );
	var segmentIds = this.get( "segmentIds" );
	
	// Create a visualization for the entire document
	this.documentView = new DocumentView({ "model" : this });
	
	// Create source boxes and typing UIs
	segmentIds.forEach( function(segmentId) {
		
		// Generate HTML DOM elements
		this.documentView.addSegment( segmentId );
		
		// Create a SourceBox (matching pair of state and view) for each segment
		var sourceBox = new SourceBoxState({ "el" : ".SourceBoxView" + segmentId });
		this.sourceBoxes[segmentId] = sourceBox;
		this.listenTo( sourceBox, "mouseover", function(){} );
		this.listenTo( sourceBox, "mouseout", function(){} );
		this.listenTo( sourceBox, "click", this.focusOnSegment );
		this.listenTo( sourceBox, "mouseover:token", this.showSourceSuggestions );
		this.listenTo( sourceBox, "mouseout:token", this.showSourceSuggestions );
		this.listenTo( sourceBox, "click:token", function(){} );
		sourceBox.set({
			"segmentId" : segmentId,
			"tokens" : segments[ segmentId ].tokens
		});
		
		var sourceSuggestion = new SourceSuggestionState({ "el" : ".SourceSuggestionView" + segmentId });
		this.sourceSuggestions[segmentId] = sourceSuggestion;
		this.listenTo( sourceSuggestion, "mouseover", this.showSourceSuggestions );
		this.listenTo( sourceSuggestion, "mouseout", this.showSourceSuggestions );
		this.listenTo( sourceSuggestion, "click", function(){} );
		this.listenTo( sourceSuggestion, "mouseover:option", function(){} );
		this.listenTo( sourceSuggestion, "mouseout:option", function(){} );
		this.listenTo( sourceSuggestion, "click:option", this.replaceCaretToken );
		this.sourceSuggestions[segmentId].set({
			"segmentId" : segmentId
		});
		
		// Create state and view objects for the typing UI
		var targetBox = new TargetBoxState({ "segmentId" : segmentId });
		this.targetBoxes[segmentId] = targetBox;
		this.listenTo( targetBox, "updateFocus", this.updateFocus );
		this.listenTo( targetBox, "updateTranslations", this.loadTranslations );
		this.listenTo( targetBox, "updateSuggestions", this.setTargetSuggestionCandidates );
		this.listenTo( targetBox, "updateEditCoords", this.setTargetSuggestionCoords );
		this.listenTo( targetBox, "updateMatchingTokens", this.updateMatchingTokens );
		this.listenTo( targetBox, "updateEditCoords", this.showTargetSuggestions );
		this.listenTo( targetBox, "keyPress:enter", this.focusOnNextSegment );
		this.listenTo( targetBox, "keyPress:enter+shift", this.focusOnPreviousSegment );
		this.get( "targetUserText" )[ segmentId ] = "";
		this.get( "targetPrefix" )[ segmentId ] = "";
		this.get( "targetTranslationList" )[ segmentId ] = [];
		this.get( "targetChunkIndexList" )[ segmentId ] = [];
		this.get( "targetCaretIndex" )[ segmentId ] = 0;
		this.cache.translations[ segmentId ] = {};
		targetBox.set({
			"segmentId" : segmentId,
			"chunkIndexes" : segments[segmentId].chunkIndexes,
			"userText" : ""
		});
		this.loadTranslations( segmentId, "" );
		
		var targetSuggestion = new TargetSuggestionState({ "el" : ".TargetSuggestionView" + segmentId });
		this.targetSuggestions[segmentId] = targetSuggestion;
		this.listenTo( targetSuggestion, "mouseOver:*", function(){} );
		this.listenTo( targetSuggestion, "mouseOut:*", function(){} );
		this.listenTo( targetSuggestion, "mouseClick:option", this.replaceActiveTokens );
		this.listenTo( targetSuggestion, "mouseOver:option", function(){} );
		this.listenTo( targetSuggestion, "mouseOut:option", function(){} );
		this.listenTo( targetSuggestion, "mouseClick:option", this.replaceActiveTokens );
	}.bind(this) );
	this.documentView.addSegment( null );

	// Focus on the first segment
	var targetFocus = segmentIds[0];
	this.focusOnSegment( targetFocus );
};

/**
 * @param {string|null} highlightSegmentId
 * @param {integer|null} highlightTokenIndex
 * @param {number|null} [highlightXCoord]
 * @param {number|null} [highlightYCoord]
 * @private
 **/
PTM.prototype.__showSourceSuggestions = function( segmentId, tokenIndex, xCoord, yCoord ) {
	if ( segmentId === undefined ) { segmentId = null }
	if ( tokenIndex === undefined ) { tokenIndex = null }
	if ( xCoord === undefined ) { xCoord = 0 }
	if ( yCoord === undefined ) { yCoord = 0 }
	var segments = this.get( "segments" );
	if ( segments.hasOwnProperty(segmentId) ) {
		var segment = segments[segmentId];
		var source = ( tokenIndex === null ) ? "" : segment.tokens[ tokenIndex ];
		var leftContext = ( source === "" || tokenIndex === 0 ) ? "" : segment.tokens[ tokenIndex-1 ];
		this.sourceBoxes[segmentId].set({
			"hoverTokenIndex" : tokenIndex
		});
		this.sourceSuggestions[segmentId].set({
			"tokenIndex" : tokenIndex,
			"source" : source,
			"leftContext" : leftContext,
			"targets" : [],   // To be filled in asynchronously by loadWordQueries.
			"scores" : [],    // To be filled in asynchronously by loadWordQueries.
			"xCoord" : xCoord,
			"yCoord" : yCoord
		});
		if ( tokenIndex !== null ) {
			this.loadWordQueries( segmentId, source , leftContext );
		}
	}
};

/**
 * @param {string} suggestionSegmentId
 * @param {string[]} [suggestionCandidates]
 **/
PTM.prototype.setTargetSuggestionCandidates = function( segmentId, candidates ) {
	console.log( "setTargetSuggestionCandidates", segmentId, candidates );
	if ( segmentId === undefined ) { segmentId = null }
	if ( candidates === undefined ) { candidates = [] }
	this.set({
		"suggestionSegmentId" : segmentId,
		"suggestionCandidates" : candidates
	});
	this.targetSuggestions.set({
		"segmentId" : segmentId,
		"candidates" : candidates
	});
};

/**
 * @param {string} suggestionSegmentId
 * @param {number} [suggestionXCoord]
 * @param {number} [suggestionYCoord]
 **/
PTM.prototype.setTargetSuggestionCoords = function( segmentId, xCoord, yCoord ) {
	console.log( "setTargetSuggestionCoords", segmentId, xCoord, yCoord );
	if ( segmentId === undefined ) { segmentId = null }
	if ( xCoord === undefined ) { xCoord = null }
	if ( yCoord === undefined ) { yCoord = null }
	var suggestionSegmentId = this.get( "suggestionSegmentId" );
	if ( suggestionSegmentId === segmentId ) {
		this.set({
			"suggestionXCoord" : xCoord,
			"suggestionYCoord" : yCoord
		});
		this.targetSuggestions.set({
			"xCoord" : xCoord,
			"yCoord" : yCoord
		});
	}
};

PTM.prototype.updateFocus = function( segmentId, hasFocus ) {
	if ( hasFocus === undefined ) { hasFocus = false }
	this.set( "targetFocus", hasFocus ? segmentId : null );
//	this.focusOnSegment( segmentId );
};

PTM.prototype.updateMatchingTokens = function( segmentId, matchingTokens ) {
	this.get( "sourceMatchedTokens" )[ segmentId ] = matchingTokens;
	this.sourceBoxes[ segmentId ].set({
		"matchedTokenIndexes" : matchingTokens,
	});
};

PTM.prototype.updateUserText = function( segmentId, userText, caretIndex ) {
//	var targetTypingState = this.targetTypingStates[ segmentId ];
	var targetBox = this.targetBoxes[ segmentId ];
	this.get( "targetUserText" )[ segmentId ] = userText;
	this.get( "targetCaretIndex" )[ segmentId ] = caretIndex;
//	targetTypingState.setUserText( userText, caretIndex );
	targetBox.set({
		"userText" : userText,
		"caretIndex" : caretIndex
	});
};

PTM.prototype.replaceCaretToken = function( segmentId, tokenIndex, text ) {
//	var targetTypingState = this.targetTypingStates[ segmentId ];
//	var userText = targetTypingState.replaceCaretToken( text );
//	var caretIndex = userText.length;
//	this.get( "targetUserText" )[ segmentId ] = userText;
//	this.get( "targetCaretIndex" )[ segmentId ] = caretIndex;
//	targetTypingState.setUserText( userText, caretIndex );
};
PTM.prototype.replaceActiveTokens = function( segmentId, text ) {
//	var targetTypingState = this.targetTypingStates[ segmentId ];
//	var userText = targetTypingState.replaceActiveTokens( text );
//	var caretIndex = userText.length;
//	this.get( "targetUserText" )[ segmentId ] = userText;
//	this.get( "targetCaretIndex" )[ segmentId ] = caretIndex;
//	targetTypingState.setUserText( userText, caretIndex );
};

PTM.prototype.focusOnSegment = function( segmentId ) {
	this.targetBoxes[ segmentId ].focus();
};

PTM.prototype.focusOnNextSegment = function( targetFocus ) {
	var segments = this.get( "segments" );
	var segmentIds = this.get( "segmentIds" );
	var index = ( segmentIds.indexOf( targetFocus ) + 1 ) % segmentIds.length;
	var typingNewFocus = ( index >= segmentIds.length ) ? null : segmentIds[ index ];
	this.focusOnSegment( typingNewFocus );
};

PTM.prototype.focusOnPreviousSegment = function( targetFocus ) {
	var segments = this.get( "segments" );
	var segmentIds = this.get( "segmentIds" );
	var index = ( segmentIds.indexOf( targetFocus ) + segmentIds.length - 1 ) % segmentIds.length;
	var typingNewFocus = ( index < 0 ) ? null : segmentIds[ index ];
	this.focusOnSegment( typingNewFocus );
};

PTM.prototype.loadWordQueries = function( segmentId, source, leftContext ) {
	var filterEmptyResults = function( response ) {
		if ( response.hasOwnProperty( "result" ) ) {
			response.result = _.filter( response.result, function(d) { return d.tgt.length > 0 } );
		}
		return response;
	}.bind(this);
	var getTargetTerms = function( response ) {
		if ( response.hasOwnProperty( "result" ) )
			return response.result.map( function(d) { return d.tgt.join(" "); } );
		else
			return [];
	}.bind(this);
	var getTargetScores = function( response ) {
		if ( response.hasOwnProperty( "result" ) )
			return response.result.map( function(d) { return d.score } );
		else
			return [];
	}.bind(this);
	var update = function( response ) {
		var expectedSource = this.sourceSuggestions[segmentId].get("source");
		var expectedLeftContext = this.sourceSuggestions[segmentId].get("leftContext");
		if ( source === expectedSource && leftContext === expectedLeftContext ) {
			var targets = getTargetTerms( response );
			var scores = getTargetScores( response );
			this.sourceSuggestions[segmentId].set({
				"source" : source,
				"leftContext" : leftContext,
				"targets" : targets,
				"scores" : scores
			});
		}
	}.bind(this);
	var cacheKey = leftContext + ":" + source;
	var cacheAndUpdate = function( response, request ) {
		response = filterEmptyResults( response );
		this.cache.wordQueries[ cacheKey ] = response;
		update( response );
	}.bind(this);
	if ( this.cache.wordQueries.hasOwnProperty( cacheKey ) ) {
		update( this.cache.wordQueries[ cacheKey ] );
	} else {
		this.server.wordQuery( source, leftContext, cacheAndUpdate );
	}
};

PTM.prototype.loadTranslations = function( segmentId, prefix ) {
	this.get( "targetPrefix" )[ segmentId ] = prefix;
	
	/**
	 * Convert machine translation from a string to a list of tokens.
	 * @private
	 **/
	var amendTranslationTokens = function( response ) {
		if ( response.hasOwnProperty( "result" ) ) {
			var translationList = [];
			for ( var n = 0; n < response.result.length; n++ ) {
				translationList.push( response.result[n].tgt );
			}
			response.translationList = translationList;
		}
		return response;
	}.bind(this);
	/**
	 * Convert alignment indexes ("alignList") from a string to a list of {sourceIndex:number, targetIndex:number} entries ("alignIndexList").
	 * @private
	 **/
	var amendAlignIndexes = function( response ) {
		var alignIndexList = [];
		if ( response.hasOwnProperty( "result" ) ) {
			for ( var n = 0; n < response.result.length; n++ ) {
				var alignStrs = response.result[n].align;
				var alignIndexes = alignStrs.map( function(d) { 
					var st = d.split("-").map( function(d) { return parseInt(d) } );
					return { "sourceIndex" : st[0], "targetIndex" : st[1] };
				});
				alignIndexList.push( alignIndexes );
			}
		}
		response.alignIndexList = alignIndexList;
		return response;
	}.bind(this);
	/**
	 * Match each token in every machine translation to a chunk index in the source text.
	 * TODO: Push post-processing onto server?
	 * @private
	 **/
	var amendChunkIndexes = function( response ) {
		var chunkIndexList = [];
		var segments = this.get( "segments" );
		var segment = segments[ segmentId ];
		var segmentChunkIndexes = segment.chunkIndexes;
		if ( response.hasOwnProperty( "alignIndexList" ) ) {
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
		}
		response.chunkIndexList = chunkIndexList;
		return response;
	}.bind(this);
	var update = function( response ) {
		if ( this.get( "targetPrefix" )[ segmentId ] === prefix ) {
			var translationList = response.translationList;
			var alignIndexList = response.alignIndexList;
			var chunkIndexList = response.chunkIndexList;
			this.set( "targetTranslationList" )[ segmentId ] = translationList;
			this.set( "targetAlignIndexList" )[ segmentId ] = alignIndexList;
			this.set( "targetChunkIndexList" )[ segmentId ] = chunkIndexList;
//			this.targetTypingStates[ segmentId ].setTranslations( prefix, translationList, alignIndexList, chunkIndexList );
			this.targetBoxes[ segmentId ].set({
				"prefix" : prefix,
				"translationList" : translationList,
				"alignIndexList" : alignIndexList, 
				"chunkIndexList" : chunkIndexList
			});
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
