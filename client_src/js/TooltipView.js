var TooltipView = Backbone.View.extend({
	"el" : "#tooltip"
});

TooltipView.prototype.initialize = function() {
	this.views = {};
	this.views.container = d3.select( this.el );
	this.views.overlay = this.views.container.append( "div" ).attr( "class", "Overlay" )
		.style( "position", "absolute" )
		.style( "background", "#fff" )
		.style( "font", "Gill Sans, Helvetica, sans-serif" )
		.style( "border", "1px solid #9cf" )
	
	this.listenTo( this.model, "change reset", this.render );
};

TooltipView.prototype.render = function() {
	var targets = this.model.get( "targets" );
	var elems = this.views.overlay.selectAll( "div.token" ).data( targets );
	elems.enter().append( "div" ).attr( "class", "token" )
		.style( "position", "static" )
		.style( "white-space", "nowrap" )
	elems.exit().remove();
	
	this.views.overlay.call( this.__overlayStyles.bind(this) )
		.selectAll( "div.token" ).call( this.__tokenStyles.bind(this) );
};

TooltipView.prototype.__overlayStyles = function( elem ) {
	var targets = this.model.get( "targets" );
	var hasTargets = ( targets.length > 0 );
	var xCoord = this.model.get( "xCoord" );
	var yCoord = this.model.get( "yCoord" );
	elem.style( "display", hasTargets ? "inline-block" : "none" )
		.style( "left", xCoord + "px" )
		.style( "top", yCoord + "px" )
}

TooltipView.prototype.__tokenStyles = function( elem ) {
	elem.text( function(d) { return d } );
};
