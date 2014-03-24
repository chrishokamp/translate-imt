var SourceSuggestionView = Backbone.View.extend({
	el : "#SourceSuggestions"
});

SourceSuggestionView.prototype.X_OFFSET = 0;
SourceSuggestionView.prototype.Y_OFFSET = -( 12 + 7) + 12 + 2;
SourceSuggestionView.prototype.CATCHER_PADDING = 4;
SourceSuggestionView.prototype.MT_COLOR = "#4292C6";
SourceSuggestionView.prototype.ACTIVE_COLOR = "#ff7f0e";

SourceSuggestionView.prototype.initialize = function() {
	this.views = {};
	this.views.container = d3.select( this.el ).call( this.__containerRenderOnce.bind(this) );
	this.views.canvas = this.views.container.style( "position", "absolute" );
	this.views.catcher = this.views.canvas.append( "div" ).attr( "class", "Catcher" ).call( this.__catcherRenderOnce.bind(this) );
	this.views.overlay = this.views.canvas.append( "div" ).attr( "class", "Overlay" ).call( this.__overlayRenderOnce.bind(this) );
	this.listenTo( this.model, "change", this.render );
};

SourceSuggestionView.prototype.render = function() {
	var targets = this.model.get( "targets" );
	var scores = this.model.get( "scores" );
	var targetsAndScores = _.range(targets.length-1,-1,-1).map( function(index) { return { "index" : index, "text" : targets[index], "score" : scores[index], "isValid" : true } } );
	var isLoaded = this.model.get( "isLoaded" );
	if ( targetsAndScores.length === 0 ) {
		targetsAndScores.push( { "index" : 0, "text" : ( isLoaded ? "Unavailable" : "Loading..." ), "score" : 0, "isValid" : false });
	}
	var elems = this.views.overlay.selectAll( "div.token" ).data( targetsAndScores );
	elems.enter().append( "div" ).attr( "class", "token" ).call( this.__tokenRenderOnce.bind(this) );
	elems.exit().remove();
	
	this.views.container.call( this.__containerRenderAlways.bind(this) );
	this.views.overlay.selectAll( "div.token" ).call( this.__tokenRenderAlways.bind(this) );
	this.views.overlay.call( this.__overlayRenderAlways.bind(this) )
	this.views.catcher.call( this.__catcherRenderAlways.bind(this) );
};

SourceSuggestionView.prototype.__containerRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "pointer-events", "none" )
		.style( "visibility", "visible" );
};
SourceSuggestionView.prototype.__containerRenderAlways = function( elem ) {
	var hasFocus = this.model.get( "hasFocus" ) && this.model.get( "hasMasterFocus" );
	var tokenIndex = this.model.get( "tokenIndex" );
	var targets = this.model.get( "targets" );
//	var isVisible = ( hasFocus && tokenIndex !== null && targets.length > 0 );
	var isVisible = ( hasFocus && tokenIndex !== null );
	elem.style( "visibility", isVisible ? "visible" : "hidden" )
		.style( "display", isVisible ? "inline-block" : "none" );
};

SourceSuggestionView.prototype.__catcherRenderOnce = function( elem ) {
	elem.style( "position", "absolute" )
		.style( "display", "inline-block" )
		.style( "background", "none" )
		.style( "pointer-events", "auto" )
		.style( "cursor", "default" )
		.on( "mouseover", this.__onMouseOver.bind(this) )
		.on( "mouseout", this.__onMouseOut.bind(this) );
};
SourceSuggestionView.prototype.__catcherRenderAlways = function( elem ) {
	var xCoord = this.model.get( "xCoord" );
	var yCoord = this.model.get( "yCoord" );
  // Called after the overlay is rendered (see render())
	var width = this.views.overlay[0][0].offsetWidth + (this.CATCHER_PADDING+2) * 2;
	var height = this.views.overlay[0][0].offsetHeight + (this.CATCHER_PADDING+2) * 2;
	elem.style( "left", (xCoord+this.X_OFFSET-this.CATCHER_PADDING-1) + "px" )
		.style( "top", (yCoord+this.Y_OFFSET+this.CATCHER_PADDING+1-height) + "px" )
		.style( "width", width + "px" )
		.style( "height", height + "px" )
};

SourceSuggestionView.prototype.__overlayRenderOnce = function( elem ) {
	elem.style( "position", "absolute" )
		.style( "display", "inline-block" )
		.style( "background", "#fff" )
		.style( "padding", "2px 2px 0 2px" )
};
SourceSuggestionView.prototype.__overlayRenderAlways = function( elem ) {
	var hasFocus = this.model.get( "hasFocus" ) && this.model.get( "hasMasterFocus" );
	var tokenIndex = this.model.get( "tokenIndex" );
	var targets = this.model.get( "targets" );
	var isVisible = ( hasFocus && tokenIndex !== null && targets.length > 0 );
	var targets = this.model.get( "targets" );
	var xCoord = this.model.get( "xCoord" );
	var yCoord = this.model.get( "yCoord" );
	elem.style( "left", (xCoord+this.X_OFFSET) + "px" )
		.style( "top", ( isVisible ? yCoord-targets.length*24 : yCoord-24 ) + "px" )
		.style( "border", "1px solid " + ( isVisible ? this.MT_COLOR : "#999" ) )
		.style( "box-shadow", "0 0 5px " + ( isVisible ? this.MT_COLOR : "#999" ) )
};

SourceSuggestionView.prototype.__tokenRenderOnce = function( elem ) {
	var borderTop = function(_,i) {
		return i===0 ? null : "1px dotted " + this.MT_COLOR
	}.bind(this);
	elem.style( "position", "static" )
		.style( "display", "block" )
		.style( "border-top", borderTop )
		.style( "padding", "2px" )
		.classed( "TargetLang", true )
		.style( "white-space", "nowrap" )
		.style( "pointer-events", "auto" )
		.style( "cursor", "pointer" )
		.on( "mouseover", this.__onMouseOverOption.bind(this) )
		.on( "mouseout", this.__onMouseOutOption.bind(this) )
		.on( "mouseup", this.__onMouseClickOption.bind(this) );
	elem.append( "span" ).attr( "class", "TokenLeft" )
		.style( "display", "inline-block" )
		.style( "height", "8px" )
		.style( "width", "0px" )
		.style( "margin-left", "1px" )
		.style( "background-color", "#fff" )
	elem.append( "span" ).attr( "class", "TokenMid" )
		.style( "display", "inline-block" )
		.style( "height", "8px" )
		.style( "width", "0px" )
		.style( "margin-right", "5px" )
		.style( "background-color", "#fff" )
	elem.append( "span" ).attr( "class", "TokenRight" )
		.style( "margin-right", "5px" )
};
SourceSuggestionView.prototype.__tokenRenderAlways = function( elem ) {
	var targets = this.model.get( "targets" );
	var hideBar = ( targets.length === 0 );
	var barLength = d3.scale.linear().domain( [ 0, 1 ] ).range( [ 0, 1 ] );
	var threeBarLengths = function(score) { return Math.min( 1, Math.max( 1.0 / 3, Math.ceil( score * 3 ) / 3 ) ); };
	var optionIndex = this.model.get( "optionIndex" );
	var color = function(d) {
		if ( ! d.isValid )
			return "#999";
		else if ( optionIndex === d.index )
			return this.ACTIVE_COLOR;
		else
			return this.MT_COLOR;
	}.bind(this);
	var leftWidth = function(d) {
		return ( hideBar ? 0 : 24 ) * ( 1 - threeBarLengths(d.score) ) + "px";
	}.bind(this);
	var midWidth = function(d) {
		return ( hideBar ? 0 : 24 ) * threeBarLengths(d.score) + "px";
	}.bind(this);
	elem.select( ".TokenLeft" )
		.style( "width", leftWidth )
	elem.select( ".TokenMid" )
		.style( "background-color", color )
		.style( "width", midWidth )
	elem.select( ".TokenRight" )
		.text( function(d) { return d.text } )
		.style( "color", color );	
};

SourceSuggestionView.prototype.__onMouseOver = function() {
	var hasFocus = this.model.get( "hasFocus" ) && this.model.get( "hasMasterFocus" );
	var tokenIndex = this.model.get( "tokenIndex" );
	var targets = this.model.get( "targets" );
	var isVisible = ( hasFocus && tokenIndex !== null && targets.length > 0 );
	if ( isVisible ) {
		var segmentId = this.model.get( "segmentId" );
		this.model.trigger( "mouseover", segmentId );
	}
};
SourceSuggestionView.prototype.__onMouseOut = function() {
	var hasFocus = this.model.get( "hasFocus" ) && this.model.get( "hasMasterFocus" );
	var tokenIndex = this.model.get( "tokenIndex" );
	var targets = this.model.get( "targets" );
	var isVisible = ( hasFocus && tokenIndex !== null && targets.length > 0 );
	if ( isVisible ) {
		var segmentId = this.model.get( "segmentId" );
		this.model.trigger( "mouseout", segmentId );
	}
};
SourceSuggestionView.prototype.__onMouseClick = function() {
	var hasFocus = this.model.get( "hasFocus" ) && this.model.get( "hasMasterFocus" );
	var tokenIndex = this.model.get( "tokenIndex" );
	var targets = this.model.get( "targets" );
	var isVisible = ( hasFocus && tokenIndex !== null && targets.length > 0 );
	if ( isVisible ) {
		var segmentId = this.model.get( "segmentId" );
		this.model.trigger( "click", segmentId );
	}
};
SourceSuggestionView.prototype.__onMouseOverOption = function( option ) {
	var hasFocus = this.model.get( "hasFocus" ) && this.model.get( "hasMasterFocus" );
	var tokenIndex = this.model.get( "tokenIndex" );
	var targets = this.model.get( "targets" );
	var isVisible = ( hasFocus && tokenIndex !== null && targets.length > 0 );
	if ( isVisible ) {
		var segmentId = this.model.get( "segmentId" );
		this.model.set( "optionIndex", option.index );
		this.model.trigger( "mouseover", segmentId );
		this.model.trigger( "mouseover:option", segmentId, option.index );
	}
};
SourceSuggestionView.prototype.__onMouseOutOption = function( option ) {
	var hasFocus = this.model.get( "hasFocus" ) && this.model.get( "hasMasterFocus" );
	var tokenIndex = this.model.get( "tokenIndex" );
	var targets = this.model.get( "targets" );
	var isVisible = ( hasFocus && tokenIndex !== null && targets.length > 0 );
	if ( isVisible ) {
		var segmentId = this.model.get( "segmentId" );
		this.model.set( "optionIndex", null );
		this.model.trigger( "mouseout", segmentId );
		this.model.trigger( "mouseout:option", segmentId, option.index );
	}
};
SourceSuggestionView.prototype.__onMouseClickOption = function( option ) {
	var hasFocus = this.model.get( "hasFocus" ) && this.model.get( "hasMasterFocus" );
	var tokenIndex = this.model.get( "tokenIndex" );
	var targets = this.model.get( "targets" );
	var isVisible = ( hasFocus && tokenIndex !== null && targets.length > 0 );
	if ( isVisible ) {
		var segmentId = this.model.get( "segmentId" );
		this.model.trigger( "click", segmentId );
		this.model.trigger( "click:option", segmentId, option.index );
	}
};
