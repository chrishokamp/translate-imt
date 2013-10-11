var SourceBoxView = Backbone.View.extend({
	el : ".SourceBoxView"
});

SourceBoxView.prototype.DEFAULT_COLOR = "#000";
SourceBoxView.prototype.MATCHED_COLOR = "#999";
SourceBoxView.prototype.MT_COLOR = "#4292C6";

SourceBoxView.prototype.initialize = function() {
	this.views = {};
	this.views.container = d3.select( this.el ).style( "pointer-events", "none" );
	this.views.overlay = this.views.container.append( "div" ).attr( "class", "Overlay" ).call( this.__overlayRenderOnce.bind(this) );
	this.listenTo( this.model, "change", this.render );
};

SourceBoxView.prototype.render = function() {
	var tokens = this.model.get( "tokens" );
	var elems = this.views.overlay.selectAll( "span.Token" ).data( tokens );
	var subElems = elems.enter().append( "span" ).attr( "class", "Token" ).call( this.__tokenRenderOnce.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenTerm" ).call( this.__tokenTermRenderOnce.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenSep" ).call( this.__tokenSepRenderOnce.bind(this) );
	elems.exit().remove();

	this.views.overlay.call( this.__overlayRenderAlways.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).call( this.__tokenRenderAlways.bind(this) )
	this.views.overlay.selectAll( "span.Token" ).select( "span.TokenTerm" ).call( this.__tokenTermRenderAlways.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).select( "span.TokenSep" ).call( this.__tokenSepRenderAlways.bind(this) );
};

SourceBoxView.prototype.__overlayRenderOnce = function( elem ) {
	elem.classed( "SourceLang", true )
		.style( "padding", "25px 10px 5px 10px" )
		.style( "word-spacing", "0.1em" );
};
SourceBoxView.prototype.__overlayRenderAlways = function() {};

SourceBoxView.prototype.__tokenRenderOnce = function( elem ) {
	elem.style( "pointer-events", "auto" )
		.style( "cursor", "default" )
		.on( "mouseover", this.__tokenOnMouseOver.bind(this) )
		.on( "mouseout", this.__tokenOnMouseOut.bind(this) );
};
SourceBoxView.prototype.__tokenRenderAlways = function( elem ) {};
SourceBoxView.prototype.__tokenOnMouseOver = function( _, tokenIndex ) {
	var hasFocus = this.model.get( "hasFocus" );
	var segmentId = this.model.get( "segmentId" );
	if ( hasFocus ) {
		this.trigger( "mouseOver:token", segmentId, tokenIndex, d3.event.srcElement.offsetLeft, d3.event.srcElement.offsetTop );
	}
};
SourceBoxView.prototype.__tokenOnMouseOut = function() {
	var hasFocus = this.model.get( "hasFocus" );
	if ( hasFocus ) {
		this.trigger( "mouseOut:token", null, null );
	}
};

SourceBoxView.prototype.__tokenTermRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.style( "vertical-align", "top" )
		.text( function(d) { return d } );
};
SourceBoxView.prototype.__tokenTermRenderAlways = function( elem ) {
	elem.style( "color", this.__tokenTermForeground.bind(this) )
		.style( "border-bottom", this.__tokenTermBackground.bind(this) );
};
SourceBoxView.prototype.__tokenTermForeground = function( _, tokenIndex ) {
	var matchedTokenIndexes = this.model.get( "matchedTokenIndexes" );
	return ( matchedTokenIndexes[tokenIndex] === true ) ? this.MATCHED_COLOR : this.DEFAULT_COLOR;
};
SourceBoxView.prototype.__tokenTermBackground = function( _, tokenIndex ) {
	var hoverTokenIndex = this.model.get( "hoverTokenIndex" );
	return ( tokenIndex === hoverTokenIndex ) ? "1px solid " + this.MT_COLOR : "1px solid #eee";
};

SourceBoxView.prototype.__tokenSepRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.style( "vertical-align", "top" )
		.text( " " );
};
SourceBoxView.prototype.__tokenSepRenderAlways = function() {};
