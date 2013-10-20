var TargetBoxView = Backbone.View.extend({
	el : ".TargetBoxView"
});

TargetBoxView.prototype.initialize = function( options ) {
	var segmentId = options.segmentId;
	this.container = d3.select( this.el ).style( "pointer-events", "none" ).call( this.__containerRenderOnce.bind(this) );
	this.canvas = this.container.append( "div" ).attr( "class", "Canvas" ).style( "position", "absolute" );
	this.overlay = this.canvas.append( "div" ).attr( "class", "TargetOverlayView TargetOverlayView" + segmentId );
	this.textarea = this.container.append( "div" ).attr( "class", "TargetTextareaView TargetTextareaView" + segmentId );
	this.listenTo( this.model, "change:userText change:hasFocus", this.render.bind(this) );
};

TargetBoxView.prototype.render = function() {
	this.container.call( this.__containerRenderAlways.bind(this) );
	var canvasXCoord = this.canvas[0][0].offsetLeft;
	var canvasYCoord = this.canvas[0][0].offsetTop;
	this.model.set({
		"canvasXCoord" : canvasXCoord,
		"canvasYCoord" : canvasYCoord
	});
};

TargetBoxView.prototype.__containerRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" );
};

TargetBoxView.prototype.__containerRenderAlways = function() {};
