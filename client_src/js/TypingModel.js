var TypingModel = Backbone.Model.extend({
	"defaults" : {
		"allSpanElements" : [],
		"activeSpanElement" : null,
		"caretSpanSegment" : null,
		"activeSuggestionElements" : [],
		"caretCharIndex" : 0,
		"inputSelectionStart" : 0,
		"inputSelectionEnd" : 0
	}
});

TypingModel.prototype.initialize = function( options ) {
	this.state = options.state;
	this.listenTo( this.state, "modified", this.__update );
};

TypingModel.prototype.__update = function() {
	var allTokens = this.state.getAttr( "allTokens" );

	// Each token contained fields: user, mt, sep, suggestions, startCharIndex, isActive, isUser, isMt, isMtExpired, isMtCandidate
	// Each span element now contains fields: text, segments
	var allSpanElements = allTokens;
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		span.text = span.isUser ? span.user : span.mt;
		span.segments = [];
	}
	
	// Identify active span element
	var activeSpanElement = null;
	var activeSuggestionElements = [];
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		if ( span.isActive ) {
			activeSpanElement = span;
			for ( var j = 0; j < span.suggestions.length; j++ ) {
				var suggestion = span.suggestions[j];
				activeSuggestionElements.push({ "text" : suggestion, "sep" : " ", "segments" : [] });
			}
		}
	}
	
	// Initialize segments within each span element
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		span.segments.push({
			"text" : span.text,
			"startCharIndex" : span.startCharIndex,
			"endCharIndex" : span.startCharIndex + span.text.length
		});
		span.segments.push({
			"text" : span.sep,
			"startCharIndex" : span.startCharIndex + span.text.length,
			"endCharIndex" : span.startCharIndex + span.text.length + span.sep.length
		});
	}
	for ( var i = 0; i < activeSuggestionElements.length; i++ ) {
		var span = activeSuggestionElements[i];
		span.segments.push({
			"text" : span.text
		});
		span.segments.push({
			"text" : span.sep
		});
	}
	
	// Split segments on caret position and text selection boundaries
	var selectionStartCharIndex = this.state.getAttr( "selectionStartCharIndex" );
	var selectionEndCharIndex = this.state.getAttr( "selectionEndCharIndex" );
	var selectionMinCharIndex = Math.min( selectionStartCharIndex, selectionEndCharIndex );
	var selectionMaxCharIndex = Math.max( selectionStartCharIndex, selectionEndCharIndex );
	var caretCharIndex = this.state.getAttr( "caretCharIndex" );
	var splitCharIndexes = [ caretCharIndex, selectionMinCharIndex, selectionMaxCharIndex ];
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		var segments = span.segments;
		for ( var j = 0; j < splitCharIndexes.length; j++ )
			segments = this.__splitSegments( segments, splitCharIndexes[j] );
		span.segments = segments;
	}
	
	// Identify all selected span segments and the segment immediately following the caret
	var caretSpanSegment = null;
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		for ( var j = 0; j < span.segments.length; j++ ) {
			var segment = span.segments[j];
			segment.isSelected = ( selectionMinCharIndex <= segment.startCharIndex && segment.endCharIndex <= selectionMaxCharIndex );
			if ( segment.startCharIndex === caretCharIndex ) { caretSpanSegment = segment }
		}
	}

	this.setAttr( "allSpanElements", allSpanElements );
	this.setAttr( "activeSpanElement", activeSpanElement );
	this.setAttr( "caretSpanSegment", caretSpanSegment );
	this.setAttr( "activeSuggestionElements", activeSuggestionElements );
	this.setAttr( "caretCharIndex", caretCharIndex );
	this.setAttr( "inputSelectionStart", selectionMinCharIndex );
	this.setAttr( "inputSelectionEnd", selectionMaxCharIndex );
	this.flush();
};

TypingModel.prototype.__splitSegments = function( initSegments, charIndex ) {
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
