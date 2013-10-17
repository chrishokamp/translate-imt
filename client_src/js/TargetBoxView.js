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
	var xCoord = this.container[0][0].offsetLeft;
	var yCoord = this.container[0][0].offsetTop;
	this.model.set({
		"canvasXCoord" : xCoord,
		"canvasYCoord" : yCoord
	});
};

