var SourceSuggestionView = Backbone.View.extend({
	el : "#SourceSuggestions"
});

SourceSuggestionView.prototype.X_OFFSET = 0;
SourceSuggestionView.prototype.Y_OFFSET = -( 12 + 7 ) + 30;
SourceSuggestionView.prototype.CATCHER_PADDING = 4;
SourceSuggestionView.prototype.MT_COLOR = "#4292C6";

SourceSuggestionView.prototype.initialize = function() {
	this.views = {};
	this.views.container = d3.select( this.el ).style( "pointer-events", "none" ).style( "opacity", 0 );
	this.views.canvas = this.views.container.style( "position", "absolute" );
	this.views.catcher = this.views.canvas.append( "div" ).attr( "class", "Catcher" ).call( this.__catcherRenderOnce.bind(this) );
	this.views.overlay = this.views.canvas.append( "div" ).attr( "class", "Overlay" ).call( this.__overlayRenderOnce.bind(this) );
	this.listenTo( this.model, "change", this.render );
};

SourceSuggestionView.prototype.render = function() {
	var targets = this.model.get( "targets" );
	var scores = this.model.get( "scores" );
	var targetsAndScores = _.range(targets.length-1,-1,-1).map( function(index) { return { "text" : targets[index], "score" : scores[index] } } );
	var elems = this.views.overlay.selectAll( "div.token" ).data( targetsAndScores );
	elems.enter().append( "div" ).attr( "class", "token" ).call( this.__tokenRenderOnce.bind(this) );
	elems.exit().remove();
	
	this.views.container.style( "opacity", function() { return targets.length === 0 ? 0 : 1 } )
	this.views.overlay.selectAll( "div.token" ).call( this.__tokenRenderAlways.bind(this) );
	this.views.overlay.call( this.__overlayRenderAlways.bind(this) )
	this.views.catcher.call( this.__catcherRenderAlways.bind(this) );
};

SourceSuggestionView.prototype.__catcherRenderOnce = function( elem ) {
	elem.style( "position", "absolute" )
		.style( "background", "none" )
		.style( "pointer-events", "auto" )
		.style( "cursor", "default" )
		.on( "mouseover", this.__onMouseOver.bind(this) )
		.on( "mouseout", this.__onMouseOut.bind(this) );
};
SourceSuggestionView.prototype.__catcherRenderAlways = function( elem ) {
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
		.style( "left", (xCoord-this.CATCHER_PADDING-1+this.X_OFFSET) + "px" )
		.style( "top", (yCoord-this.CATCHER_PADDING-1+this.Y_OFFSET-height) + "px" )
		.style( "width", width + "px" )
		.style( "height", height + "px" )
};

SourceSuggestionView.prototype.__overlayRenderOnce = function( elem ) {
	elem.classed( "TargetLang", true )
		.style( "position", "absolute" )
		.style( "background", "#fff" )
		.style( "border", "1px solid " + this.MT_COLOR )
		.style( "box-shadow", "0 0 5px " + this.MT_COLOR )
		.style( "padding", "2px 2px 0 2px" )
};
SourceSuggestionView.prototype.__overlayRenderAlways = function( elem ) {
	var targets = this.model.get( "targets" );
	if ( targets.length === 0 ) {
		elem.style( "display", "none" );
		return;
	}
	var xCoord = this.model.get( "xCoord" );
	var yCoord = this.model.get( "yCoord" );
	elem.style( "display", "inline-block" )
		.style( "left", (xCoord+this.X_OFFSET) + "px" )
		.style( "top", (yCoord+this.Y_OFFSET-targets.length*24) + "px" );
};

SourceSuggestionView.prototype.__tokenRenderOnce = function( elem ) {
	var opacity = d3.scale.linear().domain( [ 0, 0.25 ] ).range( [ 0, 1 ] );
	elem.text( function(d) { return d.text } )
		.style( "opacity", function(d) { return Math.min( 1, Math.max( 0, opacity(d.score) ) ) } )
		.style( "position", "static" )
		.style( "display", "block" )
		.style( "padding", "2px" )
		.style( "border-top", function(_,i) { return i===0 ? null : "1px dotted " + this.MT_COLOR }.bind(this) )
		.style( "white-space", "nowrap" )
		.style( "pointer-events", "auto" )
		.style( "cursor", "pointer" )
		.style( "color", this.MT_COLOR )
		.on( "mouseover", this.__onMouseOverOption.bind(this) )
		.on( "mouseout", this.__onMouseOutOption.bind(this) )
		.on( "mouseup", this.__onMouseClickOption.bind(this) );
};
SourceSuggestionView.prototype.__tokenRenderAlways = function( elem ) {};

SourceSuggestionView.prototype.__onMouseOver = function() {
	var segmentId = this.model.get( "segmentId" );
	var tokenIndex = this.model.get( "tokenIndex" );
	var xCoord = this.model.get( "xCoord" );
	var yCoord = this.model.get( "yCoord" );
	this.model.trigger( "mouseOver:*", segmentId, tokenIndex, xCoord, yCoord );
};
SourceSuggestionView.prototype.__onMouseOverOption = function() {
	var segmentId = this.model.get( "segmentId" );
	var tokenIndex = this.model.get( "tokenIndex" );
	var xCoord = this.model.get( "xCoord" );
	var yCoord = this.model.get( "yCoord" );
	this.model.trigger( "mouseOver:*", segmentId, tokenIndex, xCoord, yCoord );
	this.model.trigger( "mouseOver:option" );
};
SourceSuggestionView.prototype.__onMouseOut = function() {
	this.model.trigger( "mouseOut:*" );
};
SourceSuggestionView.prototype.__onMouseOutOption = function() {
	this.model.trigger( "mouseOut:*" );
	this.model.trigger( "mouseOut:option" );
};
SourceSuggestionView.prototype.__onMouseClickOption = function( d ) {
	var segmentId = this.model.get( "segmentId" )
	this.model.trigger( "mouseClick:option", segmentId, d.text );
};
