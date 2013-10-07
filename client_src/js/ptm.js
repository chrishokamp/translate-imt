var PTM = Backbone.Model.extend({
	"defaults" : {
		"url" : null,
		"docId" : null,           // Load from disk
		"segmentIds" : [],        // Load from disk
		"segments" : {},          // Load from disk
		"highlightSegmentId" : null,   // Pass onto TooltipState: null or one of segmentIds
		"highlightTokenIndex" : null,  // Pass onto TooltipState: null or an integer index >= 0
		"highlightSource" : "",        // Pass onto TooltipState: (possibly empty) string
		"highlightTargets" : [],       // Pass onto TooltipState: (possibly empty) list of strings
		"highlightXCoord" : 0,         // Pass onto TooltipState
		"highlightYCoord" : 0,         // Pass onto TooltipState
		"typingUserText" : {},      // Pass onto TargetStates (indexed by segmentId): (possibly empty) string
		"typingPrefix" : {},        // Pass onto TargetStates (indexed by segmentId): (possibly empty) string
		"typingTranslations" : {},  // Pass onto TargetStates (indexed by segmentId): (possibly empty) list of strings
		"typingCaretIndex" : {},    // Pass onto TargetStates (indexed by segmentId): an integer index >= 0
		"typingFocus" : null,       // Pass onto TargetStates: null or one of segmentIds
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
	this.tooltipState = null;
	this.tooltipView = null;
	this.sourceStates = {};
	this.sourceViews = {};
	this.targetStates = {};
	this.targetViews = {};
	this.cache = {};
	this.cache.wordQueries = {};
	this.cache.translations = {};
	this.highlightToken = _.debounce( this.__highlightToken, 10 );
	this.fetch({ success : this.loaded.bind(this) });
};

PTM.prototype.loaded = function() {
	var segmentIds = this.get( "segmentIds" );
	var segments = this.get( "segments" );
	var container = d3.select( "#ptm" );
	
	// Create tooltip object
	var tooltipState = new TooltipState({ "ptm" : this });
	var tooltipView = new TooltipView({ "model" : tooltipState });
	
	// Save results in PTM object
	this.tooltipState = tooltipState;
	this.tooltipView = tooltipView;
	
	// Initialize word query cache
	this.cache.wordQueries[ "" ] = [];
	
	for ( var i = 0; i < segmentIds.length; i++ ) {
		var segmentId = segmentIds[ i ];

		// Generate HTML DOM elements
		container.append( "div" ).attr( "class", "SourceView SourceView" + segmentId );
		container.append( "div" ).attr( "class", "TargetView TargetView" + segmentId );
		
		// Create state, model, and view objects
		var sourceState = new SourceState({ "ptm" : this });
		var sourceView = new SourceView({ "model" : sourceState, "el" : ".SourceView" + segmentId });
		var targetState = new TargetState({ "ptm" : this });
		var targetView = new TargetView({ "model" : targetState, "el" : ".TypingUI" + segmentId });
		
		// Populate source text
		sourceState.set({
			"segmentId" : segmentId,
			"tokens" : segments[ segmentId ].tokens
		});
		
		// Initialize translations
		this.get( "typingPrefix" )[ segmentId ] = "";
		this.get( "typingTranslations" )[ segmentId ] = [];
		this.get( "typingCaretIndex" )[ segmentId ] = 0;
		this.cache.translations[ segmentId ] = {};
		this.updateTranslations( segmentId, "" );
		
		// Save results in PTM object
		this.sourceStates[segmentId] = sourceState;
		this.sourceViews[segmentId] = sourceView;
		this.targetStates[segmentId] = targetState;
		this.targetViews[segmentId] = targetView;
	}
	
	this.set( "typingFocus", 0 );
};

PTM.prototype.__highlightToken = function( highlightSegmentId, highlightTokenIndex, highlightXCoord, highlightYCoord ) {
	if ( highlightSegmentId === undefined ) { highlightSegmentId = null }
	if ( highlightTokenIndex === undefined ) { highlightTokenIndex = null }
	if ( highlightXCoord === undefined ) { highlightXCoord = 0 }
	if ( highlightYCoord === undefined ) { highlightYCoord = 0 }
	var segmentIds = this.get( "segmentIds" );
	var segments = this.get( "segments" );
	var highlightSource = ( highlightSegmentId !== null && highlightTokenIndex !== null ) ? segments[ highlightSegmentId ].tokens[ highlightTokenIndex ] : "";
	var onMouseOver = function() { this.highlightToken( highlightSegmentId, highlightTokenIndex, highlightXCoord, highlightYCoord ) }.bind(this);
	var onMouseOut = function() { this.highlightToken( null, null ) }.bind(this);
	var onMouseClick = function( highlightTarget ) { this.insertToken( highlightSegmentId, highlightTarget ) }.bind(this);
	
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
	this.tooltipState.set({
		"source" : highlightSource,
		"targets" : [],
		"xCoord" : highlightXCoord,
		"yCoord" : highlightYCoord + 12,
		"onMouseOver" : onMouseOver,
		"onMouseOut" : onMouseOut,
		"onMouseClick" : onMouseClick
	});
	
	// Make word query request (if necessary) and asynchronously update tooltip object
	this.updateTooltip( highlightSource )
};

PTM.prototype.insertToken = function( segmentId, token ) {
	console.log( "[click-and-insert]", segmentId, token );
};

PTM.prototype.updateTooltip = function( source ) {
	var update = function( rules ) {
		if ( this.get( "highlightSource" ) === source ) {
			var targets = rules.map( function(d) { return d.tgt } );
			this.set({
				"highlightTargets" : targets
			});
			this.tooltipState.set({
				"targets" : targets
			});
		}
	}.bind(this);
	var cacheAndUpdate = function( rules, response, request ) {
		this.cache.wordQueries[ source ] = rules;
		update( rules );
	}.bind(this);
	if ( this.cache.wordQueries.hasOwnProperty( source ) ) {
		update( this.cache.wordQueries[ source ] );
	}
	else {
		this.server.wordQuery( source, cacheAndUpdate );
	}
};

PTM.prototype.updateTranslations = function( segmentId, prefix ) {
	var update = function( translations ) {
		if ( this.get( "typingPrefix" )[ segmentId ] === prefix ) {
			this.set( "typingTranslations" )[ segmentId ] = translations;
			this.targetStates[ segmentId ].set({
				"prefix" : prefix,
				"translations" : translations
			});
		}
	}.bind(this);
	var cacheAndUpdate = function( translations, reseponse, request ) {
		this.cache.translations[ segmentId ][ prefix ] = translations;
		update( translations );
	}.bind(this);
	if ( this.cache.translations[ segmentId ].hasOwnProperty( prefix ) ) {
		if ( this.cache.translations[ segmentId ][ prefix ] !== null ) {
			update( this.cache.translations[ segmentId ][ prefix ] );
		}
		else {
			// Otherwise request has already been sent
		}
	}
	else {
		var segments = this.get( "segments" );
		var source = segments[ segmentId ].tokens.join( " " );
		this.cache.translations[ segmentId ][ prefix ] = null;
		this.server.translate( source, prefix, cacheAndUpdate );
	}
};
