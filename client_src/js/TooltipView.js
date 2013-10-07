var TooltipView = Backbone.View.extend({
	"el" : "#tooltip"
});

TooltipView.prototype.initialize = function() {
	this.views = {};
	this.views.container = d3.select( this.el )
		.style( "pointer-events", "none" )
	this.views.catcher = this.views.container.append( "div" ).attr( "class", "Catcher" )
		.style( "position", "absolute" )
		.style( "background", "none" )
	this.views.overlay = this.views.container.append( "div" ).attr( "class", "Overlay" )
		.style( "position", "absolute" )
		.style( "background", "#fff" )
		.style( "font", "Gill Sans, Helvetica, sans-serif" )
		.style( "border", "1px solid #9cf" );
	
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
	this.views.overlay.selectAll( "div.token" ).call( this.__tokenStyles.bind(this) );
	this.views.catcher.call( this.__catcherStyles.bind(this) );
};

TooltipView.prototype.__overlayStyles = function( elem ) {
	var targets = this.model.get( "targets" );
	if ( targets.length === 0 ) {
		elem.style( "display", "none" );
		return;
	}
	var xCoord = this.model.get( "xCoord" );
	var yCoord = this.model.get( "yCoord" );
	elem.style( "display", "inline-block" )
		.style( "left", xCoord + "px" )
		.style( "top", yCoord + "px" )
};

TooltipView.prototype.__tokenStyles = function( elem ) {
	var onMouseOver = this.model.get( "onMouseOver" );
	var onMouseOut = this.model.get( "onMouseOut" );
	var onMouseClick = this.model.get( "onMouseClick" );
	elem.text( function(d) { return d } )
		.style( "pointer-events", "auto" )
		.style( "cursor", "pointer" )
		.on( "mouseover", onMouseOver )
		.on( "mouseout", onMouseOut )
		.on( "click", onMouseClick );
};

TooltipView.prototype.__catcherStyles = function( elem ) {
	var targets = this.model.get( "targets" );
	if ( targets.length === 0 ) {
		elem.style( "display", "none" );
		return;
	}
	var xCoord = this.model.get( "xCoord" );
	var yCoord = this.model.get( "yCoord" );
	var onMouseOver = this.model.get( "onMouseOver" );
	var onMouseOut = this.model.get( "onMouseOut" );
	var width = this.views.overlay[0][0].offsetWidth + (2+1) * 2;
	var height = this.views.overlay[0][0].offsetHeight + (2+1) * 2;
	elem.style( "display", "inline-block" )
		.style( "left", (xCoord-2-1) + "px" )
		.style( "top", (yCoord-2-1) + "px" )
		.style( "width", width + "px" )
		.style( "height", height + "px" )
		.style( "pointer-events", "auto" )
		.style( "cursor", "pointer" )
		.on( "mouseover", onMouseOver )
		.on( "mouseout", onMouseOut );
};
