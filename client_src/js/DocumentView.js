var DocumentView = Backbone.View.extend({
	"el" : "#PTM"
});

DocumentView.prototype.WIDTH = 800;
DocumentView.prototype.PADDING = 20;
DocumentView.prototype.REGULAR_BACKGROUND = "#eee";
DocumentView.prototype.FOCUS_BACKGROUND = "#DEEBF7";
DocumentView.prototype.FOCUS_COLOR = "#9ECAE1";
DocumentView.prototype.ANIMATION_DURATION = 120;

DocumentView.prototype.initialize = function( options ) {
	this.views = {};
	this.views.container = d3.select( this.el )
		.style( "display", "inline-block" )
		.style( "z-index", -10 )
		.style( "width", this.WIDTH + "px" )
		.style( "height", 0 )
		.style( "padding", 0 )
		.style( "border", "1px solid #999" )
		.style( "border-top-right-radius", "30px" )
		.style( "border-bottom-left-radius", "50px" )
		.style( "box-shadow", "1px 1px 5px #999" )
		.style( "pointer-events", "none" )
	this.views.canvas = this.views.container.append( "div" ).attr( "class", "Canvas" ).style( "position", "absolute" );
	this.views.background = this.views.canvas.append( "div" ).attr( "class", "Background" ).call( this.__backgroundRenderOnce.bind(this) );
	this.views.focus = this.views.canvas.append( "div" ).attr( "class", "Focus" ).call( this.__focusRenderOnce.bind(this) );
	this.views.overlay = this.views.canvas.append( "div" ).attr( "class", "Overlay" ).call( this.__overlayRenderOnce.bind(this) );
	this.views.segments = {};
};

/** @private **/
DocumentView.prototype.__addHeader = function() {
	var header = this.views.overlay.append( "div" ).attr( "class", "Header" );
	header
		.style( "min-height", "20px" )
		.style( "padding", "20px 40px 20px 25px" )
		.style( "margin", "0 0 20px 0" )
		.style( "background", "#f8f8f8" )
		.style( "border-bottom", "1px solid #999" )
		.style( "border-top-right-radius", "29px" )
	header.append( "p" )
		.style( "padding", 0 )
		.style( "margin", 0 )
		.style( "font-family", "NeutraLight, Gill Sans, Helvetica, sans-serif" )
		.style( "font-size", "16pt" )
		.style( "color", "#333" )
		.text( "Predictive Translation Memory" )
	header.append( "p" )
		.style( "padding", "2px 0 0 0" )
		.style( "margin", 0 )
		.style( "font-family", "NeutraLight, Gill Sans, Helvetica, sans-serif" )
		.style( "font-size", "10pt" )
		.style( "color", "#666" )
		.text( "Visualization by Jason Chuang" )
	header.append( "p" )
		.style( "padding", "2px 0 0 0" )
		.style( "margin", 0 )
		.style( "font-family", "NeutraLight, Gill Sans, Helvetica, sans-serif" )
		.style( "font-size", "10pt" )
		.style( "color", "#666" )
		.text( "Machine Translations by Spence Green" )
	this.views.header = header;
};
/** @private **/
DocumentView.prototype.__addFooter = function() {
	var footer = this.views.overlay.append( "div" ).attr( "class", "Footer" );
	footer.style( "height", "50px" );
	this.views.footer = footer;
};

/**
 * Header is automatically inserted before the first segment.
 * Footer is inserted when addSegment is called without a segmentId.
 * @param {string|null} segmentId An unique identifier for each segment; no whitespace allowed.
 **/
DocumentView.prototype.addSegment = function( segmentId ) {
	if ( _.keys( this.views.segments ).length === 0 ) {
		this.__addHeader();
	}
	if ( segmentId === null ) {
		this.__addFooter();
		return;
	}
	var segmentView = this.views.overlay.append( "div" ).attr( "class", "SegmentView SegmentView" + segmentId )
		.style( "border-top", "1px solid " + this.REGULAR_BACKGROUND )
		.style( "border-bottom", "1px solid " + this.REGULAR_BACKGROUND )
		.style( "border-left", "25px solid " + this.REGULAR_BACKGROUND )
		.style( "background", this.REGULAR_BACKGROUND )
	var subCanvas = segmentView.append( "div" ).attr( "class", "SubCanvas" )
		.style( "position", "absolute" );
	
	segmentView.append( "div" ).attr( "class", "SourceBoxView SourceBoxView" + segmentId );
	segmentView.append( "div" ).attr( "class", "TargetBoxView TargetBoxView" + segmentId );
	subCanvas.append( "div" ).attr( "class", "SourceSuggestionView SourceSuggestionView" + segmentId ).style( "position", "absolute" ).style( "z-index", 1000 );
	subCanvas.append( "div" ).attr( "class", "TargetSuggestionView TargetSuggestionView" + segmentId ).style( "position", "absolute" ).style( "z-index", 1000 );
	this.views.segments[ segmentId ] = segmentView;
	this.resize();
};

DocumentView.prototype.__overlayRenderOnce = function( elem ) {
	elem.style( "position", "static" )
		.style( "width", this.WIDTH + "px" )
		.style( "padding", 0 );
};

DocumentView.prototype.__backgroundRenderOnce = function( elem ) {
	elem.style( "position", "absolute" )
		.style( "z-index", -25 )
		.style( "left", 0 )
		.style( "top", 0 )
		.style( "border-top-right-radius", "29px" )
		.style( "border-bottom-left-radius", "49px" )
		.style( "background", this.REGULAR_BACKGROUND );
};

DocumentView.prototype.__focusRenderOnce = function( elem ) {
	elem.style( "position", "absolute" )
		.style( "z-index", -5 )
		.style( "top", 0 + "px" )
		.style( "left", 0 + "px" )
		.style( "opacity", 0 )
		.style( "width", ( this.WIDTH - 25 ) + "px" )
		.style( "height", 0 + "px" )
		.style( "border-top", "1px solid " + this.FOCUS_COLOR )
		.style( "border-bottom", "1px solid " + this.FOCUS_COLOR )
		.style( "border-left", "25px solid " + this.FOCUS_COLOR )
		.style( "background", this.FOCUS_BACKGROUND );
};
DocumentView.prototype.__focusRenderAlways = function( elem ) {
/*
	var focusSegment = this.model.get( "focusSegment" );
	if ( focusSegment !== null ) {
		var focusSourceView = this.views.container.select( ".SourceBoxView" + focusSegment );
		var focusTargetView = this.views.container.select( ".TargetTypingView" + focusSegment );
		var top = focusSourceView[0][0].offsetTop;
		var bottom = focusTargetView[0][0].offsetTop + focusTargetView[0][0].offsetHeight;
		elem.transition().duration( this.ANIMATION_DURATION )
			.style( "opacity", 1 )
			.style( "top", (top-1) + "px" )
			.style( "height", (bottom-top) + "px" )
	}
	else {
		elem.transition().duration( this.ANIMATION_DURATION )
			.style( "opacity", 0 )
	}
*/
};

DocumentView.prototype.focus = function( focusSegment ) {
	for ( var segmentId in this.views.segments ) {
		var segmentView = this.views.segments[ segmentId ];
		segmentView
			.style( "border-top", ( focusSegment === segmentId ) ? "1px solid " + this.FOCUS_COLOR : "1px solid " + this.REGULAR_BACKGROUND )
			.style( "border-bottom", ( focusSegment === segmentId ) ? "1px solid " + this.FOCUS_COLOR : "1px solid " + this.REGULAR_BACKGROUND )
			.style( "border-left", ( focusSegment === segmentId ) ? "25px solid " + this.FOCUS_COLOR : "25px solid " + this.REGULAR_BACKGROUND )
			.style( "background", ( focusSegment === segmentId ) ? this.FOCUS_BACKGROUND : this.REGULAR_BACKGROUND );
	}
	this.views.focus.call( this.__focusRenderAlways.bind(this) );
};

DocumentView.prototype.resize = function() {
	var numSegments = _.keys( this.views.segments ).length;
	var width = this.views.overlay[0][0].offsetWidth;
	var height = this.views.overlay[0][0].offsetHeight;
	this.views.maxWidth = ( this.views.maxWidth === undefined ) ? width : Math.max( this.views.maxWidth, width );
	this.views.maxHeight = ( this.views.maxHeight === undefined ) ? height : Math.max( this.views.maxHeight, height );
	this.views.canvas
		.style( "width", this.views.maxWidth + "px" )
		.style( "height", this.views.maxHeight + "px" )
	this.views.background
		.style( "width", this.views.maxWidth + "px" )
		.style( "height", this.views.maxHeight + "px" )
	this.views.container
		.style( "width", this.views.maxWidth + "px" )
		.style( "height", this.views.maxHeight + "px" );
};

