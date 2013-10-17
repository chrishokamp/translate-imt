var TargetOverlayView = Backbone.View.extend({
	el : ".TargetOverlayView"
});

TargetOverlayView.prototype.WIDTH = 775;
TargetOverlayView.prototype.MIN_HEIGHT = 30;
TargetOverlayView.prototype.ANIMATION_DURATION = 120;

TargetOverlayView.prototype.initialize = function() {
	this.container = d3.select( this.el ).style( "pointer-events", "none" ).call( this.__containerRenderOnce.bind(this) );
	this.userContent = this.container.append( "span" ).attr( "class", "UserContent" ).classed( "UserText", true ).style( "opacity", 0 );
	this.mtContent = this.container.append( "span" ).attr( "class", "MtContent" ).classed( "TargetLang", true );

	this.render = _.debounce( this.__render, 10 );
	this.listenTo( this.model, "change:userText change:hasFocus change:bestTranslation change:showBestTranslation", this.render.bind(this) );
};

TargetOverlayView.prototype.__render = function() {
	var userText = this.model.get( "userText" );
	this.userContent.text( userText );
	
	var bestTranslation = this.model.get( "bestTranslation" );
	var elems = this.mtContent.selectAll( "span.Token" ).data( bestTranslation );
	var subElems = elems.enter().append( "span" ).attr( "class", "Token" ).call( this.__tokenRenderOnce.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenTerm" ).call( this.__tokenTermRenderOnce.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenSep" ).call( this.__tokenSepRenderOnce.bind(this) );
	elems.exit().remove();
	
	this.container.call( this.__containerRenderAlways.bind(this) );
	this.container.selectAll( "span.Token" ).call( this.__tokenRenderAlways.bind(this) )
	this.container.selectAll( "span.Token" ).select( "span.TokenTerm" ).call( this.__tokenTermRenderAlways.bind(this) );
	this.container.selectAll( "span.Token" ).select( "span.TokenSep" ).call( this.__tokenSepRenderAlways.bind(this) );
};

TargetOverlayView.prototype.__containerRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "width", (this.WIDTH-75) + "px" )
		.style( "min-height", this.MIN_HEIGHT + "px" )
		.style( "padding", "13.5px 60px 21px 15px" )
};
TargetOverlayView.prototype.__containerRenderAlways = function( elem ) {
	var hasFocus = this.model.get( "hasFocus" );
	elem//.transition().duration( this.ANIMATION_DURATION )
		.style( "padding-top", hasFocus ? "13.5px" : "3.5px" )
		.style( "padding-bottom", hasFocus ? "21px" : "16px" );
};


TargetOverlayView.prototype.__tokenRenderOnce = function() {};
TargetOverlayView.prototype.__tokenRenderAlways = function() {};

TargetOverlayView.prototype.__tokenTermRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.style( "vertical-align", "top" );
};
TargetOverlayView.prototype.__tokenTermRenderAlways = function( elem ) {
	elem.text( function(d) { return d } );
};

TargetOverlayView.prototype.__tokenSepRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.style( "vertical-align", "top" )
		.text( " " );
};
TargetOverlayView.prototype.__tokenSepRenderAlways = function() {};
