var PTM = Backbone.Model.extend({
	"defaults" : {
		"url" : null,
		"docId" : null,           // Load from disk
		"segmentIds" : [],        // Load from disk
		"segments" : {},          // Load from disk. Pass onto SourceStates
		"highlightSegmentId" : null,   // Pass onto TooltipState: null or one of segmentIds
		"highlightTokenIndex" : null,  // Pass onto TooltipState: null or an integer index >= 0
		"highlightSource" : "",        // Pass onto TooltipState: (possibly empty) string
		"highlightTargets" : [],       // Pass onto TooltipState: (possibly empty) list of strings
		"highlightXCoord" : 0,         // Pass onto TooltipState
		"highlightYCoord" : 0,         // Pass onto TooltipState
		"typingUserText" : {},         // Pass onto TargetStates (indexed by segmentId): (possibly empty) string
		"typingPrefix" : {},           // Pass onto TargetStates (indexed by segmentId): prefix string used to generate the current translations
		"typingTranslationList" : {},  // Pass onto TargetStates (indexed by segmentId): a list of translations
		"typingAlignIndexList" : {},
		"typingChunkIndexList" : {},
		"typingCaretIndex" : {},    // Pass onto TargetStates (indexed by segmentId): an integer index >= 0
		"typingFocus" : null,       // Pass onto TargetStates: null or one of segmentIds
		"suggestionSegmentId" : null,
		"suggestionChunkIndex" : null,
		"suggestionSource" : "",
		"suggestionTargets" : [],
		"suggestionXCorod" : 0,
		"suggestionYCoord" : 0,
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
	this.highlightState = null;
	this.highlightView = null;
	this.sourceStates = {};
	this.sourceViews = {};
	this.targetStates = {};
	this.targetViews = {};
	this.cache = {};
	this.cache.wordQueries = {};
	this.cache.translations = {};
	
	// Define debounced methods
	this.highlightSourceToken = _.debounce( this.__highlightSourceToken, 10 );
	this.showSuggestions = _.debounce( this.__showSuggestions, 10 );
	
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
	
	var segmentIds = this.get( "segmentIds" );
	var segments = this.get( "segments" );
	for ( var i = 0; i < segmentIds.length; i++ ) {
		var segmentId = segmentIds[i];
		var segment = segments[segmentId];
		segment = amendSegmentChunkIndexes( segment );
	}
	
	// Create highlight object
	this.highlightState = new TooltipState({ "ptm" : this });
	this.highlightView = new TooltipView({ "model" : this.highlightState, "el" : "#highlight" });

	// Create suggestion object
	this.suggestionState = new TooltipState({ "ptm" : this });
	this.suggestionView = new TooltipView({ "model" : this.suggestionState, "el" : "#suggestions" });
	
	// Initialize word query cache
	this.cache.wordQueries[ "" ] = { "rules" : [] };

	var container = d3.select( "#ptm" );
	for ( var i = 0; i < segmentIds.length; i++ ) {
		var segmentId = segmentIds[i];

		// Generate HTML DOM elements
		container.append( "div" ).attr( "class", "SourceView SourceView" + segmentId );
		container.append( "div" ).attr( "class", "TargetView TargetView" + segmentId );
		
		// Create state, model, and view objects
		var sourceState = new SourceState({ "ptm" : this });
		var sourceView = new SourceView({ "model" : sourceState, "el" : ".SourceView" + segmentId });
		this.listenTo( sourceView, "mouseOverToken", this.highlightSourceToken );
		this.listenTo( sourceView, "mouseOutToken", this.highlightSourceToken );
		var targetState = new TargetState({ "ptm" : this });
		var targetView = new TargetView({ "model" : targetState, "el" : ".TargetView" + segmentId });
		this.listenTo( targetView, "updateUserText", this.updateTargetUserText );
		this.sourceStates[segmentId] = sourceState;
		this.sourceViews[segmentId] = sourceView;
		this.targetStates[segmentId] = targetState;
		this.targetViews[segmentId] = targetView;
		
		// Initialize source text
		var segmentTokens = getSegmentTokens( segments[ segmentId ] );
		sourceState.set({
			"segmentId" : segmentId,
			"tokens" : segmentTokens
		});
		
		// Initialize target text
		this.get( "typingUserText" )[ segmentId ] = "";
		this.get( "typingPrefix" )[ segmentId ] = "";
		this.get( "typingTranslationList" )[ segmentId ] = [];
		this.get( "typingChunkIndexList" )[ segmentId ] = [];
		this.get( "typingCaretIndex" )[ segmentId ] = 0;
		targetState.set({
			"segmentId" : segmentId
		});

		// Initialize translations
		this.cache.translations[ segmentId ] = {};
		this.updateTranslations( segmentId, "" );
	}

	// Initialize global states
	var typingFocus = segmentIds[0];
	this.set( "typingFocus", typingFocus );
	for ( var i = 0; i < segmentIds.length; i++ ) {
		var segmentId = segmentIds[i];
		this.targetStates[ segmentId ].updateFocus( typingFocus === segmentId );
	}
};

/**
 * @param {string} highlightSegmentId
 * @param {integer} highlightTokenIndex
 * @param {number} [highlightXCoord]
 * @param {number} [highlightYCoord]
 * @private
 **/
PTM.prototype.__highlightSourceToken = function( highlightSegmentId, highlightTokenIndex, highlightXCoord, highlightYCoord ) {
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
			"highlightTokenIndex" : ( segmentId === highlightSegmentId ) ? highlightTokenIndex : null
		});
	}
	
	// Propagate states to tooltip object
	if ( highlightSegmentId !== null && highlightTokenIndex !== null ) {
		var onMouseOver = function() { this.highlightSourceToken( highlightSegmentId, highlightTokenIndex, highlightXCoord, highlightYCoord ) }.bind(this);
		var onMouseOut = function() { this.highlightSourceToken( null, null ) }.bind(this);
		var onMouseOverOption = function() {}.bind(this);
		var onMouseOutOption = function() {}.bind(this);
		var onMouseClickOption = function( highlightTarget ) { this.insertToken( highlightSegmentId, highlightTarget ) }.bind(this);
		this.listenTo( this.highlightView, "mouseOver", onMouseOver );
		this.listenTo( this.highlightView, "mouseOut", onMouseOut );
		this.listenTo( this.highlightView, "mouseOverOption", onMouseOverOption );
		this.listenTo( this.highlightView, "mouseOutOption", onMouseOutOption );
		this.listenTo( this.highlightView, "mouseClickOption", onMouseClickOption );
		this.highlightState.set({
			"source" : highlightSource,
			"targets" : [],
			"xCoord" : highlightXCoord,
			"yCoord" : highlightYCoord + 12
		});
	}
	else {
		this.stopListening( this.highlightView, "mouseOver" );
		this.stopListening( this.highlightView, "mouseOut" );
		this.stopListening( this.highlightView, "mouseOverOption" );
		this.stopListening( this.highlightView, "mouseOutOption" );
		this.stopListening( this.highlightView, "mouseClickOption" );
		this.highlightState.set({
			"source" : highlightSource,
			"targets" : []
		});
	}
	
	// Make word query request (if necessary) and asynchronously update tooltip object
	this.updateTooltip( highlightSource )
};

PTM.prototype.__showSuggestions = function( suggestionSegmentId, suggestionChunkIndex, suggestionXCoord, suggestionYCoord ) {
	if ( suggestionXCoord === undefined ) { suggestionXCoord = 0 }
	if ( suggestionYCoord === undefined ) { suggestionYCoord = 0 }
	
};

PTM.prototype.updateTargetUserText = function( segmentId, userText, caretIndex ) {
	this.get( "typingUserText" )[ segmentId ] = userText;
	this.get( "typingCaretIndex" )[ segmentId ] = caretIndex;
	this.targetStates[ segmentId ].updateUserText( userText, caretIndex );
};

PTM.prototype.insertToken = function( segmentId, token ) {
	console.log( "[click-and-insert]", segmentId, token );
};

PTM.prototype.focusOnNextSegment = function() {
	var typingFocus = this.get( "typingFocus" );
	var segmentIds = this.get( "segmentIds" );
	var index = segmentIds.indexOf( typingFocus );
	var typingFocus = segmentIds[ ( index + 1 ) % segmentIds.length ];
	this.set({
		"typingFocus" : typingFocus
	})
	for ( var i = 0; i < segmentIds.length; i++ ) {
		var segmentId = segmentIds[i];
		this.targetStates[ segmentId ].updateFocus( typingFocus === segmentId );
	}
};

PTM.prototype.updateTooltip = function( source ) {
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
			this.highlightState.set({
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

PTM.prototype.updateTranslations = function( segmentId, prefix ) {
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
			this.targetStates[ segmentId ].updateTranslations( prefix, translationList, alignIndexList, chunkIndexList );
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
