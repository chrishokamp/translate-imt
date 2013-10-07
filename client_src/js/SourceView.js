var SourceView = Backbone.View.extend({
	el : ".SourceView"
});

SourceView.prototype.initialize = function() {
	this.views = {};
	this.views.container = d3.select( this.el ).style( "pointer-events", "none" );
	this.views.overlay = this.views.container.append( "div" ).attr( "class", "Overlay" ).call( this.__initOverlayStyles.bind(this) );
	this.listenTo( this.model, "change reset", this.render );
};

SourceView.prototype.render = function() {
	var tokens = this.model.get( "tokens" );
	var elems = this.views.overlay.selectAll( "span.Token" ).data( tokens );
	var subElems = elems.enter().append( "span" ).attr( "class", "Token" ).call( this.__initTokenStyles.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenTerm" ).call( this.__initTokenTermStyles.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenSep" ).call( this.__initTokenSepStyles.bind(this) );
	elems.exit().remove();

	this.views.overlay.call( this.__updateOverlayStyles.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).call( this.__updateTokenStyles.bind(this) )
	this.views.overlay.selectAll( "span.Token" ).select( "span.TokenTerm" ).call( this.__updateTokenTermStyles.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).select( "span.TokenSep" ).call( this.__updateTokenSepStyles.bind(this) );
};

SourceView.prototype.__initOverlayStyles = function( elem ) {
	elem.classed( "SourceLang", true )
		.style( "word-spacing", "0.1em" );
};

SourceView.prototype.__updateOverlayStyles = function( elem ) {};

SourceView.prototype.__initTokenStyles = function( elem ) {
	var onMouseOver = function( d, tokenIndex ) {
		var segmentId = this.model.get( "segmentId" );
		this.trigger( "mouseOverToken", segmentId, tokenIndex, d3.event.srcElement.offsetLeft, d3.event.srcElement.offsetTop );
	}.bind(this);
	var onMouseOut = function() {
		this.trigger( "mouseOutToken", null, null );
	}.bind(this);

	elem.style( "pointer-events", "auto" )
		.style( "cursor", "default" )
		.on( "mouseover", onMouseOver )
		.on( "mouseout", onMouseOut );
};

SourceView.prototype.__updateTokenStyles = function( elem ) {};

SourceView.prototype.__initTokenTermStyles = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.text( function(d) { return d } );
};

SourceView.prototype.__updateTokenTermStyles = function( elem ) {
	var background = function( d, tokenIndex ) {
		var highlightTokenIndex = this.model.get( "highlightTokenIndex" );
		return ( tokenIndex === highlightTokenIndex ) ? "#99CCFF" : null;
	}.bind(this);

	elem.style( "background", background );
};

SourceView.prototype.__initTokenSepStyles = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.text( " " );
};

SourceView.prototype.__updateTokenSepStyles = function( elem ) {};
