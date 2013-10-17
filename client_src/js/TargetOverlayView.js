var TargetOverlayView = Backbone.View.extend({
	el : ".TargetOverlayView"
});

TargetOverlayView.prototype.initialize = function() {
	this.container = d3.select( this.el ).style( "pointer-events", "none" ).call( this.__containerRenderOnce.bind(this) );
	this.userPrefixContent = this.container.append( "span" ).attr( "class", "UserPrefixContent" ).call( this.__contentRenderOnce.bind(this) );
	this.userSuffixContent = this.container.append( "span" ).attr( "class", "userSuffixContent" ).call( this.__contentRenderOnce.bind(this) );
	this.mtContent = this.container.append( "span" ).attr( "class", "MtContent" );

	this.render = _.debounce( this.__render, 10 );
	this.listenTo( this.model, "change:userText change:hasFocus change:bestTranslation change:showBestTranslation", this.render.bind(this) );
};

TargetOverlayView.prototype.__render = function() {
	var userPrefixContent = this.model.get( "userPrefix" ) + this.model.get( "userSep" );
	var userSuffixContent = this.model.get( "userWord" );
	this.userPrefixContent.text( userPrefixContent );
	this.userSuffixContent.text( userSuffixContent );
	
	var caretXCoord = this.userSuffixContent[0][0].offsetLeft;
	var caretYCoord = this.userSuffixContent[0][0].offsetTop;
	var editXCoord = this.userSuffixContent[0][0].offsetLeft + this.userSuffixContent[0][0].offsetWidth;
	var editYCoord = this.userSuffixContent[0][0].offsetTop;
	this.model.set({
		"caretXCoord" : caretXCoord,
		"caretYCoord" : caretYCoord,
		"editXCoord" : editXCoord,
		"editYCoord" : editYCoord
	});

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
		.style( "width", (this.model.WIDTH-75) + "px" )
		.style( "min-height", this.model.MIN_HEIGHT + "px" )
		.style( "padding", "13.5px 61px 21px 16px" )
};
TargetOverlayView.prototype.__containerRenderAlways = function( elem ) {
	var hasFocus = this.model.get( "hasFocus" );
	elem.transition().duration( this.model.ANIMATION_DURATION )
		.style( "padding-top", hasFocus ? "13.5px" : "3.5px" )
		.style( "padding-bottom", hasFocus ? "21px" : "16px" );
};


TargetOverlayView.prototype.__contentRenderOnce = function( elem ) {
	elem.style( "visibility", "hidden" )
		.style( "vertical-align", "top" )
		.classed( "UserText", true );
};
TargetOverlayView.prototype.__contentRenderAlways = function() {};

TargetOverlayView.prototype.__tokenRenderOnce = function( elem ) {
	elem.style( "vertical-align", "top" )
		.classed( "TargetLang", true );
};
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
