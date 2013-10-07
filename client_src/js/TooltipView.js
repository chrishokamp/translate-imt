var TooltipView = Backbone.View.extend({
	el : ".Tooltip"
});

TooltipView.prototype.CATCHER_PADDING = 4;

TooltipView.prototype.initialize = function() {
	this.views = {};
	this.views.container = d3.select( this.el ).style( "pointer-events", "none" ).style( "position", "absolute" );
	this.views.catcher = this.views.container.append( "div" ).attr( "class", "Catcher" ).call( this.__initCatcherStyles.bind(this) );
	this.views.overlay = this.views.container.append( "div" ).attr( "class", "Overlay" ).call( this.__initOverlayStyles.bind(this) );
	this.listenTo( this.model, "change reset", this.render );
};

TooltipView.prototype.render = function() {
	var targets = this.model.get( "targets" );
	var elems = this.views.overlay.selectAll( "div.token" ).data( targets );
	elems.enter().append( "div" ).attr( "class", "token" ).call( this.__initTokenStyles.bind(this) );
	elems.exit().remove();
	
	this.views.overlay.call( this.__updateOverlayStyles.bind(this) )
	this.views.overlay.selectAll( "div.token" ).call( this.__updateTokenStyles.bind(this) );
	this.views.catcher.call( this.__updateCatcherStyles.bind(this) );
};

TooltipView.prototype.__initCatcherStyles = function( elem ) {
	var onMouseOver = function() { 
		this.trigger( "mouseOver" );
	}.bind(this);
	var onMouseOut = function() { 
		this.trigger( "mouseOut" );
	}.bind(this);
	elem.style( "position", "absolute" )
		.style( "background", "none" )
		.style( "pointer-events", "auto" )
		.style( "cursor", "default" )
		.on( "mouseover", onMouseOver )
		.on( "mouseout", onMouseOut );
};

TooltipView.prototype.__updateCatcherStyles = function( elem ) {
	var targets = this.model.get( "targets" );
	if ( targets.length === 0 ) {
		elem.style( "display", "none" );
		return;
	}
	var xCoord = this.model.get( "xCoord" );
	var yCoord = this.model.get( "yCoord" );
	var width = this.views.overlay[0][0].offsetWidth + (this.CATCHER_PADDING+1) * 2;
	var height = this.views.overlay[0][0].offsetHeight + (this.CATCHER_PADDING+1) * 2;
	elem.style( "display", "inline-block" )
		.style( "left", (xCoord-this.CATCHER_PADDING-1) + "px" )
		.style( "top", (yCoord-this.CATCHER_PADDING-1) + "px" )
		.style( "width", width + "px" )
		.style( "height", height + "px" )
};

TooltipView.prototype.__initOverlayStyles = function( elem ) {
	elem.classed( "TargetLang", true )
		.style( "position", "absolute" )
		.style( "background", "#fff" )
		.style( "border", "1px solid #9cf" );
};

TooltipView.prototype.__updateOverlayStyles = function( elem ) {
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

TooltipView.prototype.__initTokenStyles = function( elem ) {
	var onMouseOver = function( option, optionIndex ) {
		this.trigger( "mouseOver" ); 
		this.trigger( "mouseOverOption", option, optionIndex );
	}.bind(this);
	var onMouseOut = function( option, optionIndex ) { 
		this.trigger( "mouseOut" ); 
		this.trigger( "mouseOutOption", option, optionIndex );
	}.bind(this);
	var onMouseClick = function( option, optionIndex ) {
		this.trigger( "mouseClickOption", option, optionIndex );
	}.bind(this);
	elem.text( function(d) { return d } )
		.style( "position", "static" )
		.style( "display", "block" )
		.style( "white-space", "nowrap" )
		.style( "pointer-events", "auto" )
		.style( "cursor", "pointer" )
		.on( "mouseover", onMouseOver )
		.on( "mouseout", onMouseOut )
		.on( "mouseup", onMouseClick );
};

TooltipView.prototype.__updateTokenStyles = function( elem ) {};
