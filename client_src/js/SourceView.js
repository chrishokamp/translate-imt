var SourceView = Backbone.View.extend({
	el : "div.SourceView"
});

SourceView.prototype.initialize = function() {
	this.views = {};
	this.views.container = d3.select( this.el );
	this.views.tokens = this.views.container.append( "div" ).attr( "class", "Token" );
	this.listenTo( this.model, "change reset", this.render );
};

SourceView.prototype.render = function() {
	var elems = this.views.tokens.selectAll( "span.token" ).data( this.model.get( "tokens" ) );
	var enterElems = elems.enter().append( "span" ).attr( "class", "token" );
	enterElems.append( "span" ).attr( "class", "term" )
	enterElems.append( "span" ).attr( "class", "sep" ).text( " " )
	elems.exit().remove();
	
	this.views.tokens
		.selectAll( "span.token" ).call( this.__tokenStyles.bind(this) )
		.select( "span.term" ).call( this.__termStyles.bind(this) );
};

SourceView.prototype.__tokenStyles = function( elem ) {
	var ptm = this.model.ptm;
	var segmentId = this.model.get( "segmentId" );
	var highlightTokenIndex = this.model.get( "highlightTokenIndex" );
	var onMouseOver = function( d, tokenIndex ) { ptm.highlightToken( segmentId, tokenIndex, d3.event.srcElement.offsetLeft, d3.event.srcElement.offsetTop ) };
	var onMouseOut = function( d, tokenIndex ) { ptm.highlightToken( null, null ) };
	
	elem.style( "font-family", "Palatino Linotype, serif" )
		.style( "cursor", "pointer" )
		.style( "margin", "0 0.1em 1.0em 0.1em" )
		.style( "line-height", "125%" )
		.on( "mouseover", onMouseOver )
		.on( "mouseout", onMouseOut );
};

SourceView.prototype.__termStyles = function( elem ) {
	var highlightTokenIndex = this.model.get( "highlightTokenIndex" );
	var background = function( d, tokenIndex ) { return ( tokenIndex === highlightTokenIndex ) ? "#99CCFF" : null };

	elem.text( function(d) { return d } )
		.style( "background", background );
};
