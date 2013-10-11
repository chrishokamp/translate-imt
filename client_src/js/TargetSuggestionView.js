var TargetSuggestionView = Backbone.View.extend({
	el : "#TargetSuggestions"
});

TargetSuggestionView.prototype.X_OFFSET = 0;
TargetSuggestionView.prototype.Y_OFFSET = 12;
TargetSuggestionView.prototype.CATCHER_PADDING = 4;
TargetSuggestionView.prototype.MT_COLOR = "#4292C6";

TargetSuggestionView.prototype.initialize = function() {
	this.views = {};
	this.views.container = d3.select( this.el ).style( "pointer-events", "none" ).style( "position", "absolute" );
	this.views.catcher = this.views.container.append( "div" ).attr( "class", "Catcher" ).call( this.__catcherRenderOnce.bind(this) );
	this.views.overlay = this.views.container.append( "div" ).attr( "class", "Overlay" ).call( this.__overlayRenderOnce.bind(this) );
	this.listenTo( this.model, "change", this.render );
};

TargetSuggestionView.prototype.render = function() {
	var candidates = this.model.get( "candidates" );
	var elems = this.views.overlay.selectAll( "div.token" ).data( candidates );
	elems.enter().append( "div" ).attr( "class", "token" ).call( this.__tokenRenderOnce.bind(this) );
	elems.exit().remove();
	
	this.views.overlay.call( this.__overlayRenderAlways.bind(this) )
	this.views.overlay.selectAll( "div.token" ).call( this.__tokenRenderAlways.bind(this) );
	this.views.catcher.call( this.__catcherRenderAlways.bind(this) );
};

TargetSuggestionView.prototype.__catcherRenderOnce = function( elem ) {
	elem.style( "position", "absolute" )
		.style( "background", "none" )
		.style( "pointer-events", "auto" )
		.style( "cursor", "default" )
		.on( "mouseover", this.__onMouseOver.bind(this) )
		.on( "mouseout", this.__onMouseOut.bind(this) );
};
TargetSuggestionView.prototype.__catcherRenderAlways = function( elem ) {
	var candidates = this.model.get( "candidates" );
	if ( candidates.length === 0 ) {
		elem.style( "display", "none" );
		return;
	}
	var xCoord = this.model.get( "xCoord" );
	var yCoord = this.model.get( "yCoord" );
	var width = this.views.overlay[0][0].offsetWidth + (this.CATCHER_PADDING+1) * 2;
	var height = this.views.overlay[0][0].offsetHeight + (this.CATCHER_PADDING+1) * 2;
	elem.style( "display", "inline-block" )
		.style( "left", (xCoord-this.CATCHER_PADDING-1+this.X_OFFSET) + "px" )
		.style( "top", (yCoord-this.CATCHER_PADDING-1+this.Y_OFFSET) + "px" )
		.style( "width", width + "px" )
		.style( "height", height + "px" )
};

TargetSuggestionView.prototype.__overlayRenderOnce = function( elem ) {
	elem.classed( "TargetLang", true )
		.style( "position", "absolute" )
		.style( "background", "#fff" )
		.style( "border", "1px solid #9cf" );
};
TargetSuggestionView.prototype.__overlayRenderAlways = function( elem ) {
	var candidates = this.model.get( "candidates" );
	if ( candidates.length === 0 ) {
		elem.style( "display", "none" );
		return;
	}
	var xCoord = this.model.get( "xCoord" );
	var yCoord = this.model.get( "yCoord" );
	elem.style( "display", "inline-block" )
		.style( "left", (xCoord+this.X_OFFSET) + "px" )
		.style( "top", (yCoord+this.Y_OFFSET) + "px" );
};

TargetSuggestionView.prototype.__tokenRenderOnce = function( elem ) {
	elem.style( "position", "static" )
		.style( "display", "block" )
		.style( "white-space", "nowrap" )
		.style( "pointer-events", "auto" )
		.style( "cursor", "pointer" )
		.style( "color", this.MT_COLOR )
		.on( "mouseover", this.__onMouseOverOption.bind(this) )
		.on( "mouseout", this.__onMouseOutOption.bind(this) )
		.on( "mouseup", this.__onMouseClickOption.bind(this) );
};
TargetSuggestionView.prototype.__tokenRenderAlways = function( elem ) {
	elem.text( function(d) { return d } )
};

TargetSuggestionView.prototype.__onMouseOver = function() {
	var segmentId = this.model.get( "segmentId" );
	var chunkIndex = this.model.get( "chunkIndex" );
	var candidates = this.model.get( "candidates" );
	var xCoord = this.model.get( "xCoord" );
	var yCoord = this.model.get( "yCoord" );
	this.trigger( "mouseOver:*", segmentId, chunkIndex, candidates, xCoord, yCoord );
};
TargetSuggestionView.prototype.__onMouseOverOption = function() {
	var segmentId = this.model.get( "segmentId" );
	var chunkIndex = this.model.get( "chunkIndex" );
	var candidates = this.model.get( "candidates" );
	var xCoord = this.model.get( "xCoord" );
	var yCoord = this.model.get( "yCoord" );
	this.trigger( "mouseOver:*", segmentId, chunkIndex, candidates, xCoord, yCoord );
	this.trigger( "mouseOver:option" );
};
TargetSuggestionView.prototype.__onMouseOut = function() {
	this.trigger( "mouseOut:*" );
};
TargetSuggestionView.prototype.__onMouseOutOption = function() {
	this.trigger( "mouseOut:*" );
	this.trigger( "mouseOut:option" );
};
TargetSuggestionView.prototype.__onMouseClickOption = function( text ) {
	var segmentId = this.model.get( "segmentId" )
	this.trigger( "mouseClick:option", segmentId, text );
};
