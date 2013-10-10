var SourceView = Backbone.View.extend({
	el : ".SourceView"
});

SourceView.prototype.initialize = function() {
	this.views = {};
	this.views.container = d3.select( this.el ).style( "pointer-events", "none" );
	this.views.overlay = this.views.container.append( "div" ).attr( "class", "Overlay" ).call( this.__overlayRenderOnce.bind(this) );
	this.listenTo( this.model, "change reset", this.render );
};

SourceView.prototype.render = function() {
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

SourceView.prototype.__overlayRenderOnce = function( elem ) {
	elem.classed( "SourceLang", true )
		.style( "word-spacing", "0.1em" );
};
SourceView.prototype.__overlayRenderAlways = function( elem ) {};

SourceView.prototype.__tokenRenderOnce = function( elem ) {
	elem.style( "pointer-events", "auto" )
		.style( "cursor", "default" )
		.on( "mouseover", this.__tokenOnMouseOver.bind(this) )
		.on( "mouseout", this.__tokenOnMouseOut.bind(this) );
};
SourceView.prototype.__tokenRenderAlways = function( elem ) {};
SourceView.prototype.__tokenOnMouseOver = function( _, tokenIndex ) {
	var segmentId = this.model.get( "segmentId" );
	this.trigger( "mouseOver", segmentId, tokenIndex, d3.event.srcElement.offsetLeft, d3.event.srcElement.offsetTop );
};
SourceView.prototype.__tokenOnMouseOut = function() {
	this.trigger( "mouseOut", null, null );
};

SourceView.prototype.__tokenTermRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.text( function(d) { return d } );
};
SourceView.prototype.__tokenTermRenderAlways = function( elem ) {
	elem.style( "color", this.__tokenTermForeground.bind(this) )
		.style( "background", this.__tokenTermBackground.bind(this) );
};
SourceView.prototype.__tokenTermForeground = function( _, tokenIndex ) {
	var matchedTokenIndexes = this.model.get( "matchedTokenIndexes" );
	return ( matchedTokenIndexes[tokenIndex] === true ) ? "#999" : "#000";
};
SourceView.prototype.__tokenTermBackground = function( _, tokenIndex ) {
	var hoverTokenIndex = this.model.get( "hoverTokenIndex" );
	return ( tokenIndex === hoverTokenIndex ) ? "#99CCFF" : null;
};

SourceView.prototype.__tokenSepRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.text( " " );
};
SourceView.prototype.__tokenSepRenderAlways = function( elem ) {};
