var SourceBoxView = Backbone.View.extend({
	el : ".SourceBoxView"
});

SourceBoxView.prototype.UNMATCHED_COLOR = "#000";
SourceBoxView.prototype.MATCHED_COLOR = "#4292C6";
SourceBoxView.prototype.DIM_COLOR = "#aaa";
SourceBoxView.prototype.MT_COLOR = "#4292C6";

SourceBoxView.prototype.ANIMATION_DURATION = 120;

SourceBoxView.prototype.initialize = function() {
	this.container = d3.select( this.el ).call( this.__containerRenderOnce.bind(this) );
	this.listenTo( this.model, "change", this.render );
};

SourceBoxView.prototype.render = function() {
	var tokens = this.model.get( "tokens" );
	var elems = this.container.selectAll( "span.Token" ).data( tokens );
	var subElems = elems.enter().append( "span" ).attr( "class", "Token" ).call( this.__tokenRenderOnce.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenTerm" ).call( this.__tokenTermRenderOnce.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenSep" ).call( this.__tokenSepRenderOnce.bind(this) );
	elems.exit().remove();

	this.container.call( this.__containerRenderAlways.bind(this) );
	this.container.selectAll( "span.Token" ).call( this.__tokenRenderAlways.bind(this) )
	this.container.selectAll( "span.Token" ).select( "span.TokenTerm" ).call( this.__tokenTermRenderAlways.bind(this) );
	this.container.selectAll( "span.Token" ).select( "span.TokenSep" ).call( this.__tokenSepRenderAlways.bind(this) );
};

SourceBoxView.prototype.__containerRenderOnce = function( elem ) {
	elem.style( "padding", "10px 60px 5px 15px" )  // "5px 60px 2.5px 15px"
		.classed( "SourceLang", true )
		.style( "pointer-events", "auto" )
		.style( "cursor", "default" )
		.on( "click", this.__mouseClick.bind(this) );
};
SourceBoxView.prototype.__containerRenderAlways = function( elem ) {};

SourceBoxView.prototype.__tokenRenderOnce = function( elem ) {
	elem.on( "mouseover", this.__mouseOverToken.bind(this) )
		.on( "mouseout", this.__mouseOutToken.bind(this) )
		.on( "click", this.__mouseClick.bind(this) );
};
SourceBoxView.prototype.__tokenRenderAlways = function() {};

SourceBoxView.prototype.__tokenTermRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.style( "vertical-align", "top" )
		.text( function(d) { return d } );
};
SourceBoxView.prototype.__tokenTermRenderAlways = function( elem ) {
	var hasFocus = this.model.get( "hasFocus" );
	var color = function( _, tokenIndex ) {
		var isHovered = ( tokenIndex === this.model.get( "hoverTokenIndex" ) );
		var hasCaret = ( this.model.get( "caretTokenIndexes" ).hasOwnProperty( tokenIndex ) );
		var hasChunk = ( this.model.get( "chunkTokenIndexes" ).hasOwnProperty( tokenIndex ) );
		var isMatched = ( this.model.get( "matchedTokenIndexes" ).hasOwnProperty( tokenIndex ) );
		if ( isHovered ) 
			return this.MT_COLOR;
		else if ( isMatched ) 
		 	return this.MATCHED_COLOR
		else
			return this.UNMATCHED_COLOR;
	}.bind(this);
	var borderBottom = function( _, tokenIndex ) {
		var isHovered = ( tokenIndex === this.model.get( "hoverTokenIndex" ) );
		var hasCaret = ( this.model.get( "caretTokenIndexes" ).hasOwnProperty( tokenIndex ) );
		var hasChunk = ( this.model.get( "chunkTokenIndexes" ).hasOwnProperty( tokenIndex ) );
		var isMatched = ( this.model.get( "matchedTokenIndexes" ).hasOwnProperty( tokenIndex ) );
		return ( hasFocus && hasChunk ) ? "1px solid " + this.UNMATCHED_COLOR : "none";
	}.bind(this);
	var paddingBottom = function( _, tokenIndex ) {
		var isHovered = ( tokenIndex === this.model.get( "hoverTokenIndex" ) );
		var hasCaret = ( this.model.get( "caretTokenIndexes" ).hasOwnProperty( tokenIndex ) );
		var hasChunk = ( this.model.get( "chunkTokenIndexes" ).hasOwnProperty( tokenIndex ) );
		var isMatched = ( this.model.get( "matchedTokenIndexes" ).hasOwnProperty( tokenIndex ) );
		return ( hasFocus && hasChunk ) ? "1px" : "2px";
	}.bind(this);
	elem.style( "color", color )
		.style( "border-bottom", borderBottom )
		.style( "padding-bottom", paddingBottom )
};

SourceBoxView.prototype.__tokenSepRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.style( "vertical-align", "top" )
		.text( " " );
};
SourceBoxView.prototype.__tokenSepRenderAlways = function() {};

SourceBoxView.prototype.__mouseOverToken = function( _, tokenIndex ) {
	var hasFocus = this.model.get( "hasFocus" );
	if ( hasFocus ) {
		var segmentId = this.model.get( "segmentId" );
		this.model.trigger( "mouseOver:token", segmentId, tokenIndex, d3.event.srcElement.offsetLeft, d3.event.srcElement.offsetTop );
	}
};
SourceBoxView.prototype.__mouseOutToken = function() {
	var hasFocus = this.model.get( "hasFocus" );
	if ( hasFocus ) {
		this.model.trigger( "mouseOut:token", null, null );
	}
};
SourceBoxView.prototype.__mouseClick = function() {
	console.log( "click", this.model )
	var segmentId = this.model.get( "segmentId" );
	this.model.trigger( "mouseClick", segmentId );
};
