var TargetOverlayView = Backbone.View.extend({
	el : ".TargetOverlayView"
});

TargetOverlayView.prototype.initialize = function() {
	this.container = d3.select( this.el ).style( "pointer-events", "none" ).call( this.__containerRenderOnce.bind(this) );
	this.prefixContent = this.container.append( "span" ).attr( "class", "PrefixContent" ).call( this.__userContentStyles.bind(this) );
	this.editingContent = this.container.append( "span" ).attr( "class", "EditingContent" ).call( this.__userContentStyles.bind(this) );
	this.mtContent = this.container.append( "span" ).attr( "class", "MtContent" ).call( this.__mtContentStyles.bind(this) );

	this.render = _.debounce( this.__render, 10 );
	this.listenTo( this.model, "change:userText change:prefixTokens change:hasFocus change:bestTranslation change:showBestTranslation", this.render.bind(this) );
};

TargetOverlayView.prototype.__render = function() {
	var prefixContent = this.model.get( "overlayPrefix" ) + this.model.get( "overlaySep" );
	var editingContent = this.model.get( "overlayEditing" );
	var mtContent = this.model.get( "bestTranslation" ).join( " " );
	this.prefixContent.text( prefixContent );
	this.editingContent.text( editingContent );
	this.mtContent.text( mtContent );
	
	var caretXCoord = this.editingContent[0][0].offsetLeft + this.editingContent[0][0].offsetWidth;
	var caretYCoord = this.editingContent[0][0].offsetTop;
	var editXCoord = this.editingContent[0][0].offsetLeft;
	var editYCoord = this.editingContent[0][0].offsetTop;
	this.model.set({
		"caretXCoord" : caretXCoord,
		"caretYCoord" : caretYCoord,
		"editXCoord" : editXCoord,
		"editYCoord" : editYCoord
	});

	this.container.call( this.__containerRenderAlways.bind(this) );
};

TargetOverlayView.prototype.__containerRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "width", (this.model.WIDTH-75) + "px" )
		.style( "min-height", this.model.MIN_HEIGHT + "px" )
		.style( "padding", "13.5px 61px 21px 16px" )  //"13.5px 61px 21px 16px"
};
TargetOverlayView.prototype.__containerRenderAlways = function() {};


TargetOverlayView.prototype.__userContentStyles = function( elem ) {
	elem.style( "visibility", "hidden" )
		.style( "vertical-align", "top" )
		.classed( "UserText", true )
		.style( "white-space", "pre-wrap" );
};

TargetOverlayView.prototype.__mtContentStyles = function( elem ) {
	elem.style( "visibility", "visible" )
		.style( "vertical-align", "top" )
		.classed( "TargetLang", true )
		.style( "white-space", "pre-wrap" );
};
