var TargetView = Backbone.View.extend({
	el : ".TargetView"
});

TargetView.prototype.KEY = {
	BACKSPACE : 8,
	TAB : 9,
	ENTER : 13,
	TICK : 192,
	WHITESPACE : 32,
	RIGHT_ARROW : 39,
	LEFT_ARROW : 37
};


TargetView.prototype.initialize = function( options ) {
	this.views = {};
	this.views.container = d3.select( this.el ).style( "pointer-events", "none" );
	this.views.overlay = this.views.container.append( "div" ).attr( "class", "Overlay" ).call( this.__overlayRenderOnce.bind(this) );
	this.views.capture = this.views.container.append( "textarea" ).attr( "class", "Capture" ).call( this.__captureRenderOnce.bind(this) );

	this.listenTo( this.model, "modified", this.render );
};

TargetView.prototype.render = function() {
	var allTokens = this.model.get( "allTokens" );
	var elems = this.views.overlay.selectAll( "span.Token" ).data( allTokens );
	var subElems = elems.enter().append( "span" ).attr( "class", "Token" ).call( this.__tokenRenderOnce.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenFirstTerm" ).call( this.__tokenFirstTermRenderOnce.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenSecondTerm" ).call( this.__tokenSecondTermRenderOnce.bind(this) );
	subElems.append( "span" ).attr( "class", "TokenSep" ).call( this.__tokenSepRenderOnce.bind(this) );
	elems.exit().remove();
	
	this.views.capture.call( this.__captureRenderAlways.bind(this) );
	this.views.overlay.call( this.__overlayRenderAlways.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).call( this.__tokenRenderAlways.bind(this) )
	this.views.overlay.selectAll( "span.Token" ).select( "span.TokenFirstTerm" ).call( this.__tokenFirstTermRenderAlways.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).select( "span.TokenSecondTerm" ).call( this.__tokenSecondTermRenderAlways.bind(this) );
	this.views.overlay.selectAll( "span.Token" ).select( "span.TokenSep" ).call( this.__tokenSepRenderAlways.bind(this) );
	this.model.postProcess();
};

TargetView.prototype.__captureRenderOnce = function( elem ) {
	elem.classed( "TargetLang", true )
		.style( "word-spacing", "0.1em" )
		.style( "pointer-events", "auto" )
		.on( "keydown", this.__onKeyDown.bind(this) )
		.on( "keyup", this.__onKeyUp.bind(this) );
};
TargetView.prototype.__captureRenderAlways = function( elem ) {
	var hadFocus = this.model.get( "hadFocus" );
	var hasFocus = this.model.get( "hasFocus" );
	if ( hadFocus !== hasFocus ) {
		if ( hasFocus ) {
			elem.style( "display", "inline-block" )
				.style( "visibility", "visible" )
			elem[0][0].focus();
		}
		else {
			elem.style( "display", "none" )
				.style( "visibility", "none" );
		}
	}
};
TargetView.prototype.__onKeyDown = function() {
	var keyCode = d3.event.keyCode;
	if ( keyCode === this.KEY.ENTER ) {
		d3.event.preventDefault();
		d3.event.cancelBubble = true;
	}
};
TargetView.prototype.__onKeyUp = function() {
	var keyCode = d3.event.keyCode;
	if ( keyCode === this.KEY.ENTER ) {
		d3.event.preventDefault();
		d3.event.cancelBubble = true;
		if ( d3.event.shiftKey ) {
			this.trigger( "keyPress:shift:enter" )
		}
		else if ( !d3.event.shiftKey && !d3.event.metaKey && !d3.event.ctrlKey && !d3.event.altKey && !d3.event.altGraphKey ) {
			this.trigger( "keyPress:enter" );
		}
	}
	else {
		var segmentId = this.model.get( "segmentId" );
		this.trigger( "keyPress:-", segmentId, d3.event.srcElement.value, d3.event.srcElement.selectionStart );
	}
};

TargetView.prototype.__overlayRenderOnce = function( elem ) {
	elem.classed( "TargetLang", true )
		.style( "word-spacing", "0.1em" );
};
TargetView.prototype.__overlayRenderAlways = function( elem ) {
	
};

TargetView.prototype.__tokenRenderOnce = function( elem ) {
};
TargetView.prototype.__tokenRenderAlways = function( elem ) {
};

TargetView.prototype.__tokenFirstTermRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.style( "color", "#000" )
};
TargetView.prototype.__tokenFirstTermRenderAlways = function( elem ) {
	var hasFocus = this.model.get( "hasFocus" );
	elem.text( function(d) { return d.firstTerm } )
		.style( "border-bottom", function(d) { return ( hasFocus && d.isActive ) ? "1px solid #69c" : "none" } )
};

TargetView.prototype.__tokenSecondTermRenderOnce = function( elem ) {
	elem.style( "display", "inline-block" )
		.style( "white-space", "pre-wrap" )
		.style( "color", "#69c" )
};
TargetView.prototype.__tokenSecondTermRenderAlways = function( elem ) {
	var hasFocus = this.model.get( "hasFocus" );
	elem.text( function(d) { return d.secondTerm } )
		.style( "border-bottom", function(d) { return ( hasFocus && d.isActive ) ? "1px solid #69c" : "none" } )
};

TargetView.prototype.__tokenSepRenderOnce = function( elem ) {};
TargetView.prototype.__tokenSepRenderAlways = function( elem ) {
	elem.text( function(d) { return d.sep } );
};
