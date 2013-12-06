var PTM = Backbone.Model.extend({
	"url" : function() {
		return this.get( "url" );
	},
	"defaults" : {
		"isLogging" : true,
		"activities" : []
	}
});

PTM.prototype.initialize = function() {
	this.listenTo( this, "change", this.makeActivityLogger( "ptm", "", this ) );
	var referenceTime = new Date().getTime();
	this.set( "referenceTime", referenceTime );
};

PTM.prototype.load = function( url ) {
	this.reset();
	this.set( "url", url );
	this.fetch({
		success : this.loaded.bind(this),
		error: this.loadError.bind(this)
	});
};

PTM.prototype.loadError = function( model, response, options ) {
	console.log( "[PTM.load] fail", this, model, response, options );
};

/**
 * Post-process segments received from the MT server.
 * @private
 **/
PTM.prototype.loaded = function( model, response, options ) {
	console.log( "[PTM.load] success", this, model, response, options );
	var segments = this.get( "segments" );
	var segmentIds = _.keys( segments ).sort( function(a,b) { return parseInt(a) - parseInt(b) } );
	this.set( "segmentIds", segmentIds );
	this.setup();
};

PTM.prototype.timestamp = function() {
	return ( new Date().getTime() - this.get("referenceTime") ) / 1000;
};

PTM.prototype.playback = function() {
	var reset = function() {
		this.set( "isLogging", false );
		for ( var key in this.sourceBoxes )
			this.sourceBoxes[key].reset();
		for ( var key in this.sourceBoxSuggestions )
			this.sourceBoxSuggestions[key].reset();
		for ( var key in this.targetBoxes )
			this.targetBoxes[key].reset();
		for ( var key in this.targetBoxSuggestions )
			this.targetBoxSuggestions[key].reset();
	}.bind(this);
	var restore = function() {
		this.set( "isLogging", true );
	}.bind(this);
	var replay = function( element, subElement, keyValues ) {
		return function() {
			if ( element === "ptm" )
				this.set( keyValues );
			else
				this[ element ][ subElement ].set( keyValues );
		}.bind(this);
	}.bind(this);
	
	var maxTime = 0;
	var delay = 1;
	var activities = this.get( "activities" );
	setTimeout( reset, delay * 1000 );
	activities.forEach( function( activity ) {
		var time = activity.time;
		var element = activity.element;
		var subElement = activity.subElement;
		var keyValues = activity.keyValues;
		maxTime = Math.max( maxTime, time );
		setTimeout( replay( element, subElement, keyValues ), (time+delay) * 1000 );
	});
	setTimeout( restore, (maxTime+delay) * 1000 );
};

PTM.prototype.makeActivityLogger = function( elemId, subElemId, elem ) {
	return function() {
		if ( this.get("isLogging") === true ) {
			this.logActivities( elemId, subElemId, elem );
		}
	}.bind(this);
};
PTM.prototype.logActivities = function( elemId, subElemId, elem ) {
	var activity = {
		"time" : this.timestamp(),
		"element" : elemId,
		"subElement" : subElemId,
		"keyValues" : {}
	};
	for ( var attribute in elem.changed ) {
		activity.keyValues[ attribute ] = elem.get( attribute );
	}
	this.get("activities").push(activity);
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
	this.optionPanel = null;
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
	this.updateTargetSuggestions = this.__updateTargetSuggestions; //_.debounce( this.__updateTargetSuggestions, 10 );
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
		sourceBox.on( "change", this.makeActivityLogger( "sourceBoxes", segmentId, sourceBox ), this );
		sourceBox.set({
			"segmentId" : segmentId,
			"tokens" : segments[ segmentId ].tokens
		});
		this.sourceBoxes[segmentId] = sourceBox;
		
		var sourceSuggestion = new SourceSuggestionState({ "el" : ".SourceSuggestionView" + segmentId });
		sourceSuggestion.on( "change", this.makeActivityLogger( "sourceSuggestions", segmentId, sourceSuggestion ), this );
		sourceSuggestion.set({
			"segmentId" : segmentId
		});
		this.sourceSuggestions[segmentId] = sourceSuggestion;
		
		// Create state and view objects for the typing UI
		var targetBox = new TargetBoxState({ "segmentId" : segmentId });
		targetBox.on( "change", this.makeActivityLogger( "targetBoxes", segmentId, targetBox ), this );
		targetBox.set({
			"segmentId" : segmentId,
			"chunkVector" : segments[segmentId].chunkVector,
			"userText" : ""
		});
		this.targetBoxes[segmentId] = targetBox;
		
		var targetSuggestion = new TargetSuggestionState({ "el" : ".TargetSuggestionView" + segmentId });
		targetSuggestion.on( "change", this.makeActivityLogger( "targetSuggestions", segmentId, targetSuggestion ), this );
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
		this.listenTo( sourceSuggestion, "click:option", this.clickToInsertSourceSuggestion );
		
//		this.listenTo( targetBox, "keypress:enter", this.focusOnNextSegment );
		this.listenTo( targetBox, "keypress:enter", this.insertSelectedTargetSuggestion_OR_focusOnNextSegment );
		this.listenTo( targetBox, "keypress:enter+shift", this.focusOnPreviousSegment );
		this.listenTo( targetBox, "keypress:tab", this.insertSelectedTargetSuggestion_OR_insertFirstSuggestion );
//		this.listenTo( targetBox, "keypress:tab", this.insertFirstSuggestion );
		this.listenTo( targetBox, "keypress:up", this.previousTargetSuggestion );
		this.listenTo( targetBox, "keypress:down", this.nextTargetSuggestion );
		this.listenTo( targetBox, "keypress:esc", this.noTargetSuggestion_OR_cycleAssists );
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
		this.listenTo( targetSuggestion, "click:option", this.clickToInsertTargetSuggestion );
		
		this.cache.translations[ segmentId ] = {};
		this.loadTranslations( segmentId, "" );
	}.bind(this) );
	this.documentView.addSegment( null );

	// Create an options panel
	this.optionPanel = new OptionPanelState();
	this.listenTo( this.optionPanel, "change", this.setAssists )
	
	// Focus on the first segment
	this.focusOnSegment( segmentIds[0] );
};

PTM.prototype.resizeDocument = function( segmentId ) {
	this.documentView.resize();
};

PTM.prototype.setAssists = function() {
	var enableMT = this.optionPanel.get("enableMT");
	var enableBestTranslation = enableMT;
	var enableSuggestions = enableMT && this.optionPanel.get("enableSuggestions");
	var enableHover = enableMT && this.optionPanel.get("enableHover");
	var segmentIds = this.get( "segmentIds" );
	for ( var i = 0; i < segmentIds.length; i++ ) {
		var id = segmentIds[i];
		this.targetBoxes[id].set({
			"enableSuggestions" : enableSuggestions,
			"enableBestTranslation" : enableBestTranslation
		});
		this.sourceBoxes[id].set({
			"enableHover" : enableHover
		});
	}
};

PTM.prototype.cycleAssists = function( segmentId ) {
	var enableSuggestions = this.targetBoxes[segmentId].get("enableSuggestions");
	var enableBestTranslation = this.targetBoxes[segmentId].get("enableBestTranslation");
	if ( enableSuggestions ) {
		enableSuggestions = false;
		enableBestTranslation = true;
	}
	else {
		if ( enableBestTranslation ) {
			enableSuggestions = false;
			enableBestTranslation = false;
		}
		else {
			enableSuggestions = true;
			enableBestTranslation = true;
		}
	}
	var segmentIds = this.get( "segmentIds" );
	for ( var i = 0; i < segmentIds.length; i++ ) {
		var id = segmentIds[i];
		this.targetBoxes[id].set({
			"enableSuggestions" : enableSuggestions,
			"enableBestTranslation" : enableBestTranslation
		});
		this.sourceBoxes[id].set({
			"enableHover" : enableSuggestions
		});
	}
	this.optionPanel.set({
		"enableMT" : enableBestTranslation,
		"enableHover" : enableSuggestions,
		"enableSuggestions" : enableSuggestions
	});
};

PTM.prototype.noTargetSuggestion_OR_cycleAssists = function( segmentId ) {
	var optionIndex = this.targetSuggestions[segmentId].get("optionIndex");
	if ( optionIndex === null )
		this.cycleAssists( segmentId )
	else
		this.noTargetSuggestion( segmentId );
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
			"targets" : [],	  // To be filled in asynchronously by loadWordQueries.
			"scores" : [],	  // To be filled in asynchronously by loadWordQueries.
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

PTM.prototype.clickToInsertSourceSuggestion = function( segmentId, optionIndex ) {
	var options = this.sourceSuggestions[segmentId].get( "targets" );
	if ( options.length > 0 ) {
		var text = options[ optionIndex ];
		this.targetBoxes[segmentId].replaceEditingToken( text );
		this.targetBoxes[segmentId].focus();
	}
};
PTM.prototype.clickToInsertTargetSuggestion = function( segmentId, optionIndex ) {
	var options = this.targetSuggestions[segmentId].get( "candidates" );
	if ( options.length > 0 ) {
		var text = options[ optionIndex ];
		this.targetBoxes[segmentId].replaceEditingToken( text );
		this.targetBoxes[segmentId].focus();
	}
};

PTM.prototype.insertFirstSuggestion = function( segmentId ) {
	var suggestions = this.targetBoxes[segmentId].get( "suggestions" );
	if ( suggestions.length > 0 ) {
		var text = suggestions[ 0 ];
		this.targetBoxes[segmentId].replaceEditingToken( text );
		this.targetBoxes[segmentId].focus();
	}
};
PTM.prototype.insertSelectedTargetSuggestion = function( segmentId ) {
	var optionIndex = this.targetSuggestions[segmentId].get( "optionIndex" );
	var suggestions = this.targetBoxes[segmentId].get( "suggestions" );
	var text = ( optionIndex >= suggestions.length ) ? "" : suggestions[ optionIndex ];
	this.targetBoxes[segmentId].replaceEditingToken( text );
	this.targetBoxes[segmentId].focus();
};

PTM.prototype.previousTargetSuggestion = function( segmentId ) {
	this.targetSuggestions[segmentId].previousOption();
};
PTM.prototype.nextTargetSuggestion = function( segmentId ) {
	this.targetSuggestions[segmentId].nextOption();
};
PTM.prototype.noTargetSuggestion = function( segmentId ) {
	this.targetSuggestions[segmentId].noOption();
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

PTM.prototype.insertSelectedTargetSuggestion_OR_insertFirstSuggestion = function( segmentId ) {
	var i = this.targetBoxes[segmentId].get("caretIndex");
	var userText = this.targetBoxes[segmentId].get("userText");
	if (i < userText.length) {
		this.targetBoxes[segmentId].focus();
	} 
	else {
		var optionIndex = this.targetSuggestions[segmentId].get("optionIndex");
		 if ( optionIndex === null )
			this.insertFirstSuggestion( segmentId );
		 else
			this.insertSelectedTargetSuggestion( segmentId );
	}
};

PTM.prototype.insertSelectedTargetSuggestion_OR_focusOnNextSegment = function( segmentId ) {
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

PTM.prototype.recycleTranslations = function( segmentId ) {
	var targetBox = this.targetBoxes[segmentId];
	var prefix = targetBox.get( "prefix" );
	if ( prefix !== null ) {
		var editingPrefix = targetBox.get( "editingPrefix" );
		var translationList = targetBox.get( "translationList" );
		var s2tAlignments = targetBox.get( "s2tAlignments" );
		var t2sAlignments = targetBox.get( "t2sAlignments" );
	
		var recycledTranslationList = [];
		var recycleds2tAlignments = [];
		var recycledt2sAlignments = [];

		// Recycle any translation that is still valid (i.e., matches the current editingPrefix)
		var editingPrefixHash = editingPrefix.replace( /[ ]+/g, "" );
		for ( var i = 0; i < translationList.length; i++ ) {
			var translation = translationList[i];
			var translationHash = translation.join( "" );
			var isValid = ( translationHash.substr( 0, editingPrefixHash.length ) === editingPrefixHash );
			if ( isValid ) {
				recycledTranslationList.push( translationList[i] );
				recycleds2tAlignments.push( s2tAlignments[i] );
				recycledt2sAlignments.push( t2sAlignments[i] );
			}
		}
		// Retrain at least one translation, even if none is valid
		if ( recycledTranslationList.length === 0 && translationList.length > 0 ) {
			recycledTranslationList.push( translationList[0] );
			recycleds2tAlignments.push( s2tAlignments[0] );
			recycledt2sAlignments.push( t2sAlignments[0] );
		}
		targetBox.set({
			"prefix" : editingPrefix,
			"translationList" : recycledTranslationList,
			"s2tAlignments" : recycleds2tAlignments,
	  		"t2sAlignments" : recycledt2sAlignments
		});
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
	 * Build alignment grids from the raw alignments.
	 * @private
	 **/
	var amendAlignIndexes = function( response ) {
		var s2tList = [];
		var t2sList = [];
		if ( response.hasOwnProperty( "result" ) ) {
			for ( var n = 0; n < response.result.length; n++ ) {
				var alignList = response.result[n].align;
					var s2t = {};
					var t2s = {};
					for (var i = 0; i < alignList.length; ++i) {
						var st = alignList[i].split("-");
						var srcIndex = parseInt(st[0]);
						var tgtIndex = parseInt(st[1]);
						if ( s2t.hasOwnProperty( srcIndex ))
							s2t[srcIndex].push( tgtIndex );
						else
							s2t[srcIndex] = [ tgtIndex ];
						if ( t2s.hasOwnProperty( tgtIndex ))
							t2s[tgtIndex].push(srcIndex);
						else
							t2s[tgtIndex] = [srcIndex];
					}
					s2tList.push(s2t);
					t2sList.push(t2s);
			}
		}
		response.s2t = s2tList;
		response.t2s = t2sList;
		return response;
	}.bind(this);
	var update = function( response ) {
		if ( this.targetBoxes[segmentId].get("editingPrefix") === prefix ) {
			var translationList = response.translationList;
			var s2t = response.s2t;
			var t2s = response.t2s;
			this.targetBoxes[ segmentId ].set({
				"prefix" : prefix,
				"translationList" : translationList,
				"s2tAlignments" : s2t,
				"t2sAlignments" : t2s
			});
		}
	}.bind(this);
	var cacheAndUpdate = function( response, request ) {
		response = amendTranslationTokens( response );
		response = amendAlignIndexes( response );
		this.cache.translations[ segmentId ][ prefix ] = response;
		update( response );
	}.bind(this);

  // Check the cache for translations
  if ( this.cache.translations[ segmentId ].hasOwnProperty( prefix ) ) {
		if ( this.cache.translations[ segmentId ][ prefix ] !== null ) {
			update( this.cache.translations[ segmentId ][ prefix ] );  // Otherwise request has already been sent
		}
	} else {
	// Otherwise, request translations from the service
		var segments = this.get( "segments" );
		var source = segments[ segmentId ].tokens.join( " " );
		this.cache.translations[ segmentId ][ prefix ] = null;
		this.server.translate( source, prefix, cacheAndUpdate );  // Asynchronous request
		
		// Try to recover partial set of translations during the asynchronous request
		this.recycleTranslations( segmentId );
	}
};
