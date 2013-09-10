var TypingModel = Backbone.Model.extend({
	"defaults" : {
		"allSpanElements" : [],
		"caretSpanElement" : null,
		"currentSpanElement" : null,
		"suggestionElenets" : [],
		"inputText" : "",
		"inputSelectionStart" : 0,
		"inputSelectionEnd" : 0
	}
});

TypingModel.prototype.initialize = function( options ) {
	this.state = options.state;
	this.listenTo( this.state, "modified", this.__update );
};

TypingModel.prototype.__update = function() {
	var allSpanElements = [];
	var inputText = null;
	
	// Generate a list of span elements (with fields: text, spacing, type, startCharIndex, endCharIndex)
	var matchedTokens = this.state.getAttr( "matchedTokens" );
	var currentTerm = this.state.getAttr( "currentTerm" );
	var futureTokens = this.state.getAttr( "futureTokens" );
	allSpanElements = this.__generateSpansFromTokens( allSpanElements, matchedTokens, "matched" );
	allSpanElements = this.__generateSpansFromCurrentTerm( allSpanElements, currentTerm );
	allSpanElements = this.__generateSpansFromTokens( allSpanElements, futureTokens, "future" );
	inputText = allSpanElements.map( function(d) { return d.text } ).join( "" );
	
	// Split span elements (if necessary) for selected text
	var selectionStartCharIndex = this.state.getAttr( "ui:selectionStartCharIndex" );
	var selectionEndCharIndex = this.state.getAttr( "ui:selectionEndCharIndex" );
	if ( selectionStartCharIndex === selectionEndCharIndex ) {
		var selectionIndex = selectionStartCharIndex;
		allSpanElements = this.__splitSpansByCharIndex( allSpanElements, selectionIndex );
	}
	else {
		allSpanElements = this.__splitSpansByCharIndex( allSpanElements, selectionStartCharIndex );
		allSpanElements = this.__splitSpansByCharIndex( allSpanElements, selectionEndCharIndex );
	}
	
	// Split span elements (if necessary) for positioning the caret
	var caretCharIndex = this.state.getAttr( "ui:caretCharIndex" );
	allSpanElements = this.__splitSpansByCharIndex( allSpanElements, caretCharIndex );

	// Mark the span element corresponding to the current term
	var currentSpanElement = null;
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		if ( currentSpanElement === null && span.type === "current" ) {
			currentSpanElement = span;
		}
	}
	
	// Mark selected span elements
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		span.isSelected = ( selectionStartCharIndex <= span.startCharIndex && span.endCharIndex <= selectionEndCharIndex );
	}
	
	// Mark the token immediately following the caret (insert new token if necessary)
	var caretSpanElement = null;
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		if ( caretSpanElement === null && span.startCharIndex === caretCharIndex ) {
			span.isCaret = true;
			caretSpanElement = span;
		}
		else {
			span.isCaret = false;
		}
	}
	if ( caretSpanElement === null ) {
		var charIndex = ( allSpanElements.length === 0 ) ? 0 : allSpanElements[ allSpanElements.length - 1 ].endCharIndex;
		var span = {
			"text" : "",
			"spacing" : "",
			"type" : "extra",
			"startCharIndex" : charIndex,
			"endCharIndex" : charIndex,
			"isSelected" : false,
			"isCaret" : true
		}
		allSpanElements.push( span );
		caretSpanElement = span;
	}

	this.setAttr( "allSpanElements", allSpanElements );
	this.setAttr( "caretSpanElement", caretSpanElement );
	this.setAttr( "currentSpanElement", currentSpanElement );
	this.setAttr( "inputText", inputText );
	this.setAttr( "inputSelectionStart", selectionStartCharIndex );
	this.setAttr( "inputSelectionEnd", selectionEndCharIndex );
	this.flush();
};

TypingModel.prototype.__generateSpansFromTokens = function( allSpanElements, tokens, type ) {
	var charIndex = ( allSpanElements.length === 0 ) ? 0 : allSpanElements[ allSpanElements.length - 1 ].endCharIndex;
	for ( var i = 0; i < tokens.length; i++ ) {
		var token = tokens[i];
		if ( token.text.length > 0 ) {
			var text = token.text;
			var span = { "text" : text, "spacing" : text, "type" : type };
			span.startCharIndex = charIndex;
			charIndex += text.length;
			span.endCharIndex = charIndex;
			allSpanElements.push( span );
		}
		if ( token.sep.length > 0 ) {
			var text = token.sep;
			var span = { "text" : text, "spacing" : text, "type" : type };
			span.startCharIndex = charIndex;
			charIndex += text.length;
			span.endCharIndex = charIndex;
			allSpanElements.push( span );
		}
	}
	return allSpanElements;
};

TypingModel.prototype.__generateSpansFromCurrentTerm = function( allSpanElements, currentTerm ) {
	var charIndex = ( allSpanElements.length === 0 ) ? 0 : allSpanElements[ allSpanElements.length - 1 ].endCharIndex;
	var text = currentTerm;
	var spacing = currentTerm + _.range( Math.max( 10 - text.length, 5 ) ).map( function(d) { return "_" } ).join( "" );
	var span = { "text" : text, "spacing" : spacing, "type" : "current" };
	span.startCharIndex = charIndex;
	charIndex += text.length;
	span.endCharIndex = charIndex;
	allSpanElements.push( span );
	
	if ( text.length > 0 ) {
		var text = " ";
		var span = { "text" : text, "spacing" : text, "type" : "future" };
		span.startCharIndex = charIndex;
		charIndex += text.length;
		span.endCharIndex = charIndex;
		allSpanElements.push( span );
	}
	
	return allSpanElements;
};

TypingModel.prototype.__splitSpansByCharIndex = function( initSpanElements, charIndex ) {
	var allSpanElements = [];
	for ( var i = 0; i < initSpanElements.length; i++ ) {
		var span = initSpanElements[i];
		if ( span.startCharIndex < charIndex && charIndex < span.endCharIndex ) {
			var split = charIndex - span.startCharIndex;
			var firstSpan = _.clone( span );
			var secondSpan = _.clone( span );
			firstSpan.endCharIndex = charIndex;
			secondSpan.startCharIndex = charIndex;
			firstSpan.text = span.text.substr( 0, split );
			secondSpan.text = span.text.substr( split );
			firstSpan.spacing = span.spacing.substr( 0, split );
			secondSpan.spacing = span.spacing.substr( split );
			allSpanElements.push( firstSpan );
			allSpanElements.push( secondSpan );
		}
		else {
			allSpanElements.push( span );
		}
	}
	return allSpanElements;
};
