var TypingModel = Backbone.Model.extend({
	"defaults" : {
		"allSpanElements" : [],
		"caretSpanSegment" : null,
		"currentSpanElement" : null,
		"spacingSpanElement" : null,
		"suggestionElements" : [],
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
	var suggestionElements = [];
	
	// Generate a list of span elements (with fields: text, type, startCharIndex, endCharIndex)
	// Within each span element are a list of segments (with fields: text, startCharIndex, endCharIndex)
	var matchedTokens = this.state.getAttr( "matchedTokens" );
	var currentTerm = this.state.getAttr( "currentTerm" );
	var futureTokens = this.state.getAttr( "futureTokens" );
	var suggestions = this.state.getAttr( "suggestions" )
	allSpanElements = this.__appendSpansFromTokens( allSpanElements, matchedTokens, "matched" );
	allSpanElements = this.__appendSpansFromCurrentTerm( allSpanElements, currentTerm, suggestions );
	allSpanElements = this.__appendSpansFromTokens( allSpanElements, futureTokens, "future" );
	this.__generateSegments( allSpanElements );
	
	// Split segments (if necessary) for selected text or for positioning the caret
	var selectionStartCharIndex = this.state.getAttr( "selectionStartCharIndex" );
	var selectionEndCharIndex = this.state.getAttr( "selectionEndCharIndex" );
	var selectionMinCharIndex = Math.min( selectionStartCharIndex, selectionEndCharIndex );
	var selectionMaxCharIndex = Math.max( selectionStartCharIndex, selectionEndCharIndex );
	var caretCharIndex = this.state.getAttr( "caretCharIndex" );
	this.__splitSegments( allSpanElements, [ selectionMinCharIndex, selectionMaxCharIndex, caretCharIndex ] );

	// Identify the first (and only) span element corresponding to the current term
	var currentSpanElement = null;
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		if ( span.type === "current" ) {
			currentSpanElement = span;
			break;
		}
	}
	var spacingSpanElement = null;
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		if ( span.type === "spacing" ) {
			spacingSpanElement = span;
			break;
		}
	}
	
	// Identify all selected span segments
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		for ( var j = 0; j < span.segments.length; j++ ) {
			var segment = span.segments[j];
			segment.isSelected = ( selectionMinCharIndex <= segment.startCharIndex && segment.endCharIndex <= selectionMaxCharIndex );
		}
	}
	
	// Identify the segment immediately following the caret (insert new span/segment if necessary)
	var caretSpanSegment = null;
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		for ( var j = 0; j < span.segments.length; j++ ) {
			var segment = span.segments[j];
			if ( segment.startCharIndex === caretCharIndex ) {
				caretSpanSegment = segment;
				break;
			}
		}
	}
	if ( caretSpanSegment === null ) {
		var charIndex = ( allSpanElements.length === 0 ) ? 0 : allSpanElements[ allSpanElements.length - 1 ].endCharIndex;
		var segment = {
			"text" : "",
			"startCharIndex" : charIndex,
			"endCharIndex" : charIndex
		};
		var span = {
			"text" : "",
			"type" : "extra",
			"startCharIndex" : charIndex,
			"endCharIndex" : charIndex,
			"segments" : [ segment ]
		};
		allSpanElements.push( span );
		caretSpanSegment = segment;
	}
	
	// Create suggestion Elements
	for ( var i = 0; i < suggestions.length; i++ ) {
		var text = suggestions[i];
		var segment = {
			"text" : text
		};
		var element = {
			"text" : text,
			"segments" : [ segment ]
		};
		suggestionElements.push( element );
	}

	this.setAttr( "allSpanElements", allSpanElements );
	this.setAttr( "caretSpanSegment", caretSpanSegment );
	this.setAttr( "currentSpanElement", currentSpanElement );
	this.setAttr( "spacingSpanElement", spacingSpanElement );
	this.setAttr( "suggestionElements", suggestionElements );
	this.setAttr( "inputSelectionStart", selectionMinCharIndex );
	this.setAttr( "inputSelectionEnd", selectionMaxCharIndex );
	this.flush();
};

TypingModel.prototype.__appendSpansFromTokens = function( allSpanElements, tokens, type ) {
	var charIndex = ( allSpanElements.length === 0 ) ? 0 : allSpanElements[ allSpanElements.length - 1 ].endCharIndex;
	for ( var i = 0; i < tokens.length; i++ ) {
		var token = tokens[i];
		if ( token.text.length > 0 ) {
			var text = token.text;
			var span = { "text" : text, "type" : type };
			span.startCharIndex = charIndex;
			charIndex += text.length;
			span.endCharIndex = charIndex;
			allSpanElements.push( span );
		}
		if ( token.sep.length > 0 ) {
			var text = token.sep;
			var span = { "text" : text, "type" : type };
			span.startCharIndex = charIndex;
			charIndex += text.length;
			span.endCharIndex = charIndex;
			allSpanElements.push( span );
		}
	}
	return allSpanElements;
};

TypingModel.prototype.__appendSpansFromCurrentTerm = function( allSpanElements, currentTerm, suggestions ) {
	var charIndex = ( allSpanElements.length === 0 ) ? 0 : allSpanElements[ allSpanElements.length - 1 ].endCharIndex;
	var text = currentTerm;
	var span = { "text" : text, "type" : "current" };
	span.startCharIndex = charIndex;
	charIndex += text.length;
	span.endCharIndex = charIndex;
	allSpanElements.push( span );
	
	var text = " ";
	var span = { "text" : text, "type" : "spacing" };
	span.startCharIndex = charIndex;
	charIndex += text.length;
	span.endCharIndex = charIndex;
	allSpanElements.push( span );
	
	return allSpanElements;
};

TypingModel.prototype.__generateSegments = function( allSpanElements ) {
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		var segment = {
			"text" : span.text,
			"type" : span.type,
			"startCharIndex" : span.startCharIndex,
			"endCharIndex" : span.endCharIndex
		};
		span.segments = [ segment ];
	}
};

TypingModel.prototype.__splitSegments = function( allSpanElements, charIndexes ) {
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		var segments = span.segments;
		for ( var j = 0; j < charIndexes.length; j++ ) {
			var charIndex = charIndexes[j];
			segments = this.__splitSegmentByCharIndex( segments, charIndex );
		}
		span.segments = segments;
	}
};

TypingModel.prototype.__splitSegmentByCharIndex = function( initSegments, charIndex ) {
	var segments = [];
	for ( var i = 0; i < initSegments.length; i++ ) {
		var segment = initSegments[i];
		if ( segment.startCharIndex < charIndex && charIndex < segment.endCharIndex ) {
			var split = charIndex - segment.startCharIndex;
			var firstSegment = {
				"text" : segment.text.substr( 0, split ),
				"startCharIndex" : segment.startCharIndex,
				"endCharIndex " : charIndex
			};
			var secondSegment = {
				"text" : segment.text.substr( split ),
				"startCharIndex" : charIndex,
				"endCharIndex" : segment.endCharIndex
			};
			segments.push( firstSegment );
			segments.push( secondSegment );
		}
		else {
			segments.push( segment );
		}
	}
	return segments;
};
