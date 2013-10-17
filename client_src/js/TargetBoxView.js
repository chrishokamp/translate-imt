var TargetBoxView = Backbone.View.extend({
	el : ".TargetBoxView"
});

TargetBoxView.prototype.initialize = function() {
	this.container = d3.select( this.el ).style( "pointer-events", "none" ).call( this.__containerRenderOnce.bind(this) );
	this.listenTo( this.model, "change:userText change:hasFocus", this.render.bind(this) );
};

TargetBoxView.prototype.render = function() {
	this.container.call( this.__containerRenderAlways.bind(this) );
};

TargetBoxView.prototype.__containerRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" );
};

TargetBoxView.prototype.__containerRenderAlways = function( elem ) {
	var textareaHeight = this.container.select( ".TargetTextareaView" )[0][0].offsetHeight;
	var overlayHeight = this.container.select( ".TargetOverlayView" )[0][0].offsetHeight;
	console.log( "height", textareaHeight, overlayHeight );
};

