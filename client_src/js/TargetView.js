var TargetView = Backbone.View.extend({
	el : ".TargetView"
});

TargetView.prototype.initialize = function( options ) {
	this.views = {};
	this.views.container = d3.select( this.el ).style( "pointer-events", "none" );
	this.views.overlay = this.views.container.append( "div" ).attr( "class", "Overlay" ).call( this.__initOverlayStyles.bind(this) );
	this.views.capture = this.views.container.append( "textarea" ).attr( "class", "Capture" ).call( this.__initCaptureStyles.bind(this) );

	this.listenTo( this.model, "modified", this.render );
};

TargetView.prototype.render = function() {
	var allTokens = this.model.get( "allTokens" );
	var elems = this.views.overlay.selectAll( "span.Token" ).data( allTokens );
	var subElems = elems.enter().append( "span" ).attr( "class", "Token" ).call( this.__initTokenStyles.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenFirstTerm" ).call( this.__initTokenFirstTermStyles.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenSecondTerm" ).call( this.__initTokenSecondTermStyles.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenSep" ).call( this.__initTokenSepStyles.bind(this) );
	elems.exit().remove();
	
	this.views.capture.call( this.__updateCaptureStyles.bind(this) );
	this.views.overlay.call( this.__updateOverlayStyles.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).call( this.__updateTokenStyles.bind(this) )
	this.views.overlay.selectAll( "span.Token" ).select( "span.TokenFirstTerm" ).call( this.__updateTokenFirstTermStyles.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).select( "span.TokenSecondTerm" ).call( this.__updateTokenSecondTermStyles.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).select( "span.TokenSep" ).call( this.__updateTokenSepStyles.bind(this) );
};

TargetView.prototype.__initCaptureStyles = function( elem ) {
	var updateUserText = function() {
		var segmentId = this.model.get( "segmentId" );
		this.trigger( "updateUserText", segmentId, d3.event.srcElement.value, d3.event.srcElement.selectionStart );
	}.bind(this);
	elem.classed( "TargetLang", true )
		.style( "word-spacing", "0.1em" )
		.style( "pointer-events", "auto" )
		.on( "keyup", updateUserText );
};

TargetView.prototype.__updateCaptureStyles = function( elem ) {
	var hasFocus = this.model.get( "hasFocus" );
	if ( hasFocus ) {
		elem.style( "display", "inline-block" )
			.style( "visibility", "visible" )
	}
	else {
		elem.style( "display", "none" )
			.style( "visibility", "none" );
	}
};

TargetView.prototype.__initOverlayStyles = function( elem ) {
	elem.classed( "TargetLang", true )
		.style( "word-spacing", "0.1em" );
};

TargetView.prototype.__updateOverlayStyles = function( elem ) {
	
};

TargetView.prototype.__initTokenStyles = function( elem ) {
};

TargetView.prototype.__updateTokenStyles = function( elem ) {
};

TargetView.prototype.__initTokenFirstTermStyles = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.style( "color", "#000" )
};

TargetView.prototype.__updateTokenFirstTermStyles = function( elem ) {
	elem.text( function(d) { return d.firstTerm } )
		.style( "border-bottom", function(d) { return d.isActive ? "1px solid #69c" : "none" } )
};

TargetView.prototype.__initTokenSecondTermStyles = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.style( "color", "#69c" )
};

TargetView.prototype.__updateTokenSecondTermStyles = function( elem ) {
	elem.text( function(d) { return d.secondTerm } )
		.style( "border-bottom", function(d) { return d.isActive ? "1px solid #69c" : "none" } )
};

TargetView.prototype.__initTokenSepStyles = function( elem ) {};

TargetView.prototype.__updateTokenSepStyles = function( elem ) {
	elem.text( function(d) { return d.sep } );
};

