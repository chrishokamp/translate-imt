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
	d3.select( "#PTM" ).selectAll( "*" ).remove();
	
	this.set({
		"url" : null,
		"docId" : null,
		"segmentIds" : [],
		"segments" : {},
		"focusSegment" : null
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
	this.updateSourceSuggestions = _.debounce( this.__updateSourceSuggestions, 10 );
	this.updateTargetSuggestions = _.debounce( this.__updateTargetSuggestions, 10 );
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
	var segments = this.get( "segments" );
	var segmentIds = this.get( "segmentIds" );
	
	// Create a visualization for the entire document
	this.documentView = new DocumentView({ "model" : this });
	
	// Create source boxes and typing UIs
	segmentIds.forEach( function(segmentId) {
		
		// Generate HTML DOM elements
		this.documentView.addSegment( segmentId );
		
		// Create a SourceBox (matching pair of state and view) for each segment
		var sourceBox = new SourceBoxState({
			"el" : ".SourceBoxView" + segmentId
		});
		sourceBox.set({
			"segmentId" : segmentId,
			"tokens" : segments[ segmentId ].tokens
		});
		this.sourceBoxes[segmentId] = sourceBox;
		
		var sourceSuggestion = new SourceSuggestionState({ "el" : ".SourceSuggestionView" + segmentId });
		sourceSuggestion.set({
			"segmentId" : segmentId
		});
		this.sourceSuggestions[segmentId] = sourceSuggestion;
		
		// Create state and view objects for the typing UI
		var targetBox = new TargetBoxState({ "segmentId" : segmentId });
		targetBox.set({
			"segmentId" : segmentId,
			"chunkIndexes" : segments[segmentId].chunkIndexes,
			"userText" : ""
		});
		this.targetBoxes[segmentId] = targetBox;
		
		var targetSuggestion = new TargetSuggestionState({ "el" : ".TargetSuggestionView" + segmentId });
		targetSuggestion.set({
			"segmentId" : segmentId
		});
		this.targetSuggestions[segmentId] = targetSuggestion;
		
		this.listenTo( sourceBox, "mouseover", function(){} );
		this.listenTo( sourceBox, "mouseout", function(){} );
		this.listenTo( sourceBox, "click", this.focusOnSegment );
		this.listenTo( sourceBox, "mouseover:token", this.showSourceSuggestionsFromText );
		this.listenTo( sourceBox, "mouseout:token", this.hideSourceSuggestions );
		this.listenTo( sourceBox, "click:token", function(){} );
		this.listenTo( sourceBox, "updateBoxDims", this.updateTargetSuggestions );
		this.listenTo( sourceBox, "updateBoxDims", this.resizeDocument );
		
		this.listenTo( sourceSuggestion, "mouseover", this.showSourceSuggestionsFromFloatingBox );
		this.listenTo( sourceSuggestion, "mouseout", this.hideSourceSuggestions );
		this.listenTo( sourceSuggestion, "click", function(){} );
		this.listenTo( sourceSuggestion, "mouseover:option", function(){} );
		this.listenTo( sourceSuggestion, "mouseout:option", function(){} );
		this.listenTo( sourceSuggestion, "click:option", this.insertSourceSuggestion );
		
		this.listenTo( targetBox, "keypress:enter", this.selectTargetSuggestionOrFocusOnNextSegment );
		this.listenTo( targetBox, "keypress:enter+shift", this.focusOnPreviousSegment );
		this.listenTo( targetBox, "keypress:tab", this.insertFirstSuggestion );
		this.listenTo( targetBox, "keypress:up", this.previousTargetSuggestion );
		this.listenTo( targetBox, "keypress:down", this.nextTargetSuggestion );
		this.listenTo( targetBox, "updateMatchingTokens", this.updateMatchingTokens );
		this.listenTo( targetBox, "updateSuggestions", this.updateTargetSuggestions );
		this.listenTo( targetBox, "updateEditCoords", this.updateTargetSuggestions );
		this.listenTo( targetBox, "updateFocus", this.focusOnSegment );
		this.listenTo( targetBox, "updateTranslations", this.loadTranslations );
		this.listenTo( targetBox, "updateBoxDims", this.resizeDocument );
		
		this.listenTo( targetSuggestion, "mouseover", function(){} );
		this.listenTo( targetSuggestion, "mouseout", function(){} );
		this.listenTo( targetSuggestion, "click", function(){} );
		this.listenTo( targetSuggestion, "mouseover:option", function(){} );
		this.listenTo( targetSuggestion, "mouseout:option", function(){} );
		this.listenTo( targetSuggestion, "click:option", this.insertTargetSuggestion );
		
		this.cache.translations[ segmentId ] = {};
		this.loadTranslations( segmentId, "" );
	}.bind(this) );
	this.documentView.addSegment( null );

	// Focus on the first segment
	this.focusOnSegment( segmentIds[0] );
};

PTM.prototype.resizeDocument = function() {
	this.documentView.resize();
};

PTM.prototype.showSourceSuggestionsFromText = function( segmentId ) {
	var tokenIndex = this.sourceBoxes[segmentId].get("hoverTokenIndex");
	this.updateSourceSuggestions( segmentId, tokenIndex );
};
PTM.prototype.showSourceSuggestionsFromFloatingBox = function( segmentId ) {
	var tokenIndex = this.sourceSuggestions[segmentId].get("tokenIndex");
	this.updateSourceSuggestions( segmentId, tokenIndex );
};
PTM.prototype.hideSourceSuggestions = function( segmentId ) {
	this.updateSourceSuggestions( segmentId, null );
};
PTM.prototype.__updateSourceSuggestions = function( segmentId, tokenIndex ) {
	if ( tokenIndex !== this.sourceSuggestions[segmentId].get("tokenIndex") ) {
		var xCoord = this.sourceBoxes[segmentId].get("hoverXCoord");
		var yCoord = this.sourceBoxes[segmentId].get("hoverYCoord");
		var segments = this.get( "segments" );
		var segment = segments[segmentId];
		var source = ( tokenIndex === null ) ? "" : segment.tokens[ tokenIndex ];
		var leftContext = ( source === "" || tokenIndex === 0 ) ? "" : segment.tokens[ tokenIndex-1 ];
		this.sourceBoxes[segmentId].set({
			"hoverTokenIndex" : tokenIndex
		});
		this.sourceSuggestions[segmentId].set({
			"source" : source,
			"tokenIndex" : tokenIndex,
			"leftContext" : leftContext,
			"targets" : [],   // To be filled in asynchronously by loadWordQueries.
			"scores" : [],    // To be filled in asynchronously by loadWordQueries.
			"optionIndex" : null,
			"xCoord" : xCoord,
			"yCoord" : yCoord
		});
		if ( tokenIndex !== null ) {
			this.loadWordQueries( segmentId, source , leftContext );
		}
	}
};

PTM.prototype.__updateTargetSuggestions = function( segmentId ) {
	var candidates = this.targetBoxes[segmentId].get("suggestions");
	var yOffset = this.sourceBoxes[segmentId].get("boxHeight");
	var xCoord = this.targetBoxes[segmentId].get("editXCoord");
	var yCoord = this.targetBoxes[segmentId].get("editYCoord");
	this.targetSuggestions[segmentId].set({
		"candidates" : candidates,
		"optionIndex" : null,
		"xCoord" : xCoord,
		"yCoord" : yCoord + yOffset
	});
};

PTM.prototype.updateMatchingTokens = function( segmentId, matchingTokens ) {
	this.sourceBoxes[segmentId].set({
		"matchedTokenIndexes" : matchingTokens,
	});
};

PTM.prototype.insertSourceSuggestion = function( segmentId, optionIndex ) {
	var options = this.sourceSuggestions[segmentId].get( "targets" );
	var text = ( options.length === 0 ) ? "" : options[ optionIndex ];
	this.targetBoxes[segmentId].replaceEditingToken( text );
	this.targetBoxes[segmentId].focus();
};

PTM.prototype.insertTargetSuggestion = function( segmentId, optionIndex ) {
	var options = this.targetSuggestions[segmentId].get( "candidates" );
	var text = ( options.length === 0 ) ? "" : options[ optionIndex ];
	this.targetBoxes[segmentId].replaceEditingToken( text );
	this.targetBoxes[segmentId].focus();
};

PTM.prototype.insertSelectedTargetSuggestion = function( segmentId ) {
	var optionIndex = this.targetSuggestions[segmentId].get( "optionIndex" );
	var suggestions = this.targetBoxes[segmentId].get( "suggestions" );
	var text = ( optionIndex >= suggestions.length ) ? "" : suggestions[ optionIndex ];
	this.targetBoxes[segmentId].replaceEditingToken( text );
	this.targetBoxes[segmentId].focus();
};

PTM.prototype.insertFirstSuggestion = function( segmentId ) {
	var suggestions = this.targetBoxes[segmentId].get( "suggestions" );
	var text = ( suggestions.length === 0 ) ? "" : suggestions[ 0 ];
	this.targetBoxes[segmentId].replaceEditingToken( text );
	this.targetBoxes[segmentId].focus();
};

PTM.prototype.previousTargetSuggestion = function( segmentId ) {
	this.targetSuggestions[segmentId].previousOption();
};

PTM.prototype.nextTargetSuggestion = function( segmentId ) {
	this.targetSuggestions[segmentId].nextOption();
};

PTM.prototype.focusOnSegment = function( focusSegment ) {
	this.set( "focusSegment", focusSegment );
	var segmentIds = this.get( "segmentIds" );
	segmentIds.forEach( function(segmentId) {
		if ( focusSegment === segmentId ) {
			this.sourceBoxes[segmentId].set( "hasFocus", true );
			this.sourceSuggestions[segmentId].set( "hasFocus", true );
			this.targetBoxes[segmentId].focus();  // Needed to avoid an event loop (focusing on its textarea triggers another focus event)
			this.targetSuggestions[segmentId].set( "hasFocus", true );
		}
		else {
			this.sourceBoxes[segmentId].set( "hasFocus", false );
			this.sourceSuggestions[segmentId].set( "hasFocus", false );
			this.targetBoxes[segmentId].set( "hasFocus", false );
			this.targetSuggestions[segmentId].set( "hasFocus", false );
		}
	}.bind(this) );
};

PTM.prototype.selectTargetSuggestionOrFocusOnNextSegment = function( segmentId ) {
	var optionIndex = this.targetSuggestions[segmentId].get("optionIndex");
	if ( optionIndex === null )
		this.focusOnNextSegment( segmentId );
	else
		this.insertSelectedTargetSuggestion( segmentId );
};

PTM.prototype.focusOnNextSegment = function( focusSegment ) {
	var segments = this.get( "segments" );
	var segmentIds = this.get( "segmentIds" );
	var index = ( segmentIds.indexOf( focusSegment ) + 1 ) % segmentIds.length;
	var typingNewFocus = ( index >= segmentIds.length ) ? null : segmentIds[ index ];
	this.focusOnSegment( typingNewFocus );
};

PTM.prototype.focusOnPreviousSegment = function( focusSegment ) {
	var segments = this.get( "segments" );
	var segmentIds = this.get( "segmentIds" );
	var index = ( segmentIds.indexOf( focusSegment ) + segmentIds.length - 1 ) % segmentIds.length;
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
		if ( this.targetBoxes[segmentId].get("editingPrefix") === prefix ) {
			var translationList = response.translationList;
			var alignIndexList = response.alignIndexList;
			var chunkIndexList = response.chunkIndexList;
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
