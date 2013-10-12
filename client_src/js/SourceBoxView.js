var SourceBoxView = Backbone.View.extend({
	el : ".SourceBoxView"
});

SourceBoxView.prototype.UNMATCHED_COLOR = "#000";
SourceBoxView.prototype.MATCHED_COLOR = "#4292C6";
SourceBoxView.prototype.DIM_COLOR = "#aaa";
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
		.style( "padding", "10px 60px 2.5px 15px" )
		.style( "word-spacing", "0.1em" )
		.style( "pointer-events", "auto" )
		.style( "cursor", "default" )
		.on( "click", this.__mouseClick.bind(this) );
};
SourceBoxView.prototype.__overlayRenderAlways = function( elem ) {
	var overlayPaddingBottom = function() {
		var hasFocus = this.model.get( "hasFocus" );
		return hasFocus ? "7.5px" : "2.5px";
	}.bind(this);
	elem.style( "padding-bottom", overlayPaddingBottom );
};

SourceBoxView.prototype.__tokenRenderOnce = function( elem ) {
	elem.on( "mouseover", this.__mouseOverToken.bind(this) )
		.on( "mouseout", this.__mouseOutToken.bind(this) )
		.on( "click", this.__mouseClick.bind(this) );
};
SourceBoxView.prototype.__tokenRenderAlways = function() {};

SourceBoxView.prototype.__tokenTermRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.style( "vertical-align", "top" )
		.text( function(d) { return d } );
};
SourceBoxView.prototype.__tokenTermRenderAlways = function( elem ) {
	var tokenTermColor = function( _, tokenIndex ) {
		var hasFocus = this.model.get( "hasFocus" );
		var hoverTokenIndex = this.model.get( "hoverTokenIndex" );
		var matchedTokenIndexes = this.model.get( "matchedTokenIndexes" );
		if ( ! hasFocus )
			return this.DIM_COLOR;
		else if ( tokenIndex === hoverTokenIndex ) 
			return this.MT_COLOR;
		else if ( matchedTokenIndexes[tokenIndex] === true ) 
		 	return this.MATCHED_COLOR
		else
			return this.UNMATCHED_COLOR;
	}.bind(this);
	var tokenTermBorderBottom = function( _, tokenIndex ) {
		var hasFocus = this.model.get( "hasFocus" );
		var hoverTokenIndex = this.model.get( "hoverTokenIndex" );
		return ( hasFocus && tokenIndex === hoverTokenIndex ) ? "1px solid " + this.MT_COLOR : "none";
	}.bind(this);
	var tokenTermPaddingBottom = function( _, tokenIndex ) {
		var hasFocus = this.model.get( "hasFocus" );
		var hoverTokenIndex = this.model.get( "hoverTokenIndex" );
		return ( hasFocus && tokenIndex === hoverTokenIndex ) ? "1px" : "2px";
	}.bind(this);
	elem.style( "color", tokenTermColor )
		.style( "border-bottom", tokenTermBorderBottom )
		.style( "padding-bottom", tokenTermPaddingBottom )
};

SourceBoxView.prototype.__tokenSepRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.style( "vertical-align", "top" )
		.text( " " );
};
SourceBoxView.prototype.__tokenSepRenderAlways = function() {};

SourceBoxView.prototype.__mouseOverToken = function( _, tokenIndex ) {
	var hasFocus = this.model.get( "hasFocus" );
	var segmentId = this.model.get( "segmentId" );
	if ( hasFocus ) {
		this.trigger( "mouseOver:token", segmentId, tokenIndex, d3.event.srcElement.offsetLeft, d3.event.srcElement.offsetTop );
	}
};
SourceBoxView.prototype.__mouseOutToken = function() {
	var hasFocus = this.model.get( "hasFocus" );
	if ( hasFocus ) {
		this.trigger( "mouseOut:token", null, null );
	}
};
SourceBoxView.prototype.__mouseClick = function() {
	var segmentId = this.model.get( "segmentId" );
	this.trigger( "mouseClick:*", segmentId );
};
