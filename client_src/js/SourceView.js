var SourceView = Backbone.View.extend({
	el : "div.SourceView"
});

SourceView.prototype.initialize = function() {
	this.views = {};
	this.views.container = d3.select( this.el )
		.style( "pointer-events", "none" )
		.style( "font-family", "Palatino Linotype, serif" )
		.style( "line-height", "125%" );
	this.views.tokens = this.views.container.append( "div" ).attr( "class", "Token" )
	this.listenTo( this.model, "change reset", this.render );
};

SourceView.prototype.render = function() {
	var tokens = this.model.get( "tokens" );
	var elems = this.views.tokens.selectAll( "span.Token" ).data( tokens );
	var subElems = elems.enter().append( "span" ).attr( "class", "Token" );
	subElems.append( "span" ).attr( "class", "TokenTerm" )
	subElems.append( "span" ).attr( "class", "TokenSep" )
	elems.exit().remove();
	this.views.tokens.selectAll( "span.Token" ).call( this.__tokenStyles.bind(this) )
	this.views.tokens.selectAll( "span.Token" ).select( "span.TokenTerm" ).call( this.__tokenTermStyles.bind(this) );
	this.views.tokens.selectAll( "span.Token" ).select( "span.TokenSep" ).call( this.__tokenSepStyles.bind(this) );
};

SourceView.prototype.__tokenStyles = function( elem ) {
	var ptm = this.model.ptm;
	var segmentId = this.model.get( "segmentId" );
	var highlightTokenIndex = this.model.get( "highlightTokenIndex" );
	var onMouseOver = function( d, tokenIndex ) { ptm.highlightToken( segmentId, tokenIndex, d3.event.srcElement.offsetLeft, d3.event.srcElement.offsetTop ) };
	var onMouseOut = function( d, tokenIndex ) { ptm.highlightToken( null, null ) };
	elem.style( "margin", "0 0.1em 1.0em 0.1em" )
		.style( "pointer-events", "auto" )
		.style( "cursor", "default" )
		.on( "mouseover", onMouseOver )
		.on( "mouseout", onMouseOut );
};

SourceView.prototype.__tokenSepStyles = function( elem ) {
	elem.text( " " );
};

SourceView.prototype.__tokenTermStyles = function( elem ) {
	var highlightTokenIndex = this.model.get( "highlightTokenIndex" );
	var background = function( d, tokenIndex ) { return ( tokenIndex === highlightTokenIndex ) ? "#99CCFF" : null };
	elem.text( function(d) { return d } )
		.style( "background", background );
};
