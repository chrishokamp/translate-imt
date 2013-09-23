var TypingModel = Backbone.Model.extend({
	"defaults" : {
		"allSpanElements" : [],
		"activeSpanElement" : null,
		"caretSpanSegment" : null,
		"activeSuggestionElements" : []
	}
});

TypingModel.prototype.initialize = function( options ) {
	this.state = options.state;
	this.listenTo( this.state, "modified", this.__update );
};

TypingModel.prototype.__update = function() {
	var allTokens = this.state.get( "allTokens" );

	// Each token contained fields: term, sep, startCharIndex, endCharIndex, atOrBeforeCaret, atOrAfterCaret, isActive, lookups
	// Each span element now contains fields: termSegments, sepSegments
	var allSpanElements = allTokens;
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		span.termSegments = [{
			"text" : span.term,
			"startCharIndex" : span.startCharIndex,
			"endCharIndex" : span.endCharIndex
		}];
		span.sepSegments = [{
			"text" : span.sep,
			"startCharIndex" : span.endCharIndex,
			"endCharIndex" : span.endCharIndex + span.sep.length
		}];
	}
	
	// Identify active span element
	var activeSpanElement = null;
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		if ( span.isActive ) {
			activeSpanElement = span;
		}
	}
	
	// Construct suggestion elements for the active token
	var activeSuggestionElements = [];
	if ( activeSpanElement !== null ) {
		var span = activeSpanElement;
		for ( var j = 0; j < span.mtTerms.length; j++ ) {
			var term = span.mtTerms[j];
			activeSuggestionElements.push({ "term" : term, "sep" : " " });
		}
		for ( var j = 0; j < activeSuggestionElements.length; j++ ) {
			var span = activeSuggestionElements[j];
			span.termSegments = [{ "text" : span.term }];
			span.sepSegments = [{ "text" : span.sep }];
		}
	}
	
	// Split segments on caret position and text selection boundaries
	var caretCharIndex = this.state.get( "caretCharIndex" );
	var selectionCharIndex = this.state.get( "selectionCharIndex" );
	var splitCharIndexes = [ caretCharIndex, selectionCharIndex ];
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		var termSegments = span.termSegments;
		var sepSegments = span.sepSegments;
		for ( var j = 0; j < splitCharIndexes.length; j++ ) {
			termSegments = this.__splitSegments( termSegments, splitCharIndexes[j] );
			sepSegments = this.__splitSegments( sepSegments, splitCharIndexes[j] );
		}
		span.termSegments = termSegments;
		span.sepSegments = sepSegments;
		span.segments = span.termSegments.concat( span.sepSegments );
	}
	
	// Identify all selected span segments and the segment immediately following the caret
	var caretSpanSegment = null;
	var selectionMinCharIndex = Math.min( caretCharIndex, selectionCharIndex );
	var selectionMaxCharIndex = Math.max( caretCharIndex, selectionCharIndex );
	for ( var i = 0; i < allSpanElements.length; i++ ) {
		var span = allSpanElements[i];
		for ( var j = 0; j < span.segments.length; j++ ) {
			var segment = span.segments[j];
			segment.isActive = span.isActive;
			segment.isUser = ( segment.endCharIndex <= caretCharIndex );
			segment.isSelected = ( selectionMinCharIndex <= segment.startCharIndex && segment.endCharIndex <= selectionMaxCharIndex );
			if ( segment.startCharIndex === caretCharIndex ) { caretSpanSegment = segment }
		}
	}

	this.set( "allSpanElements", allSpanElements );
	this.set( "activeSpanElement", activeSpanElement );
	this.set( "caretSpanSegment", caretSpanSegment );
	this.set( "activeSuggestionElements", activeSuggestionElements );
	this.trigger( "modified" );
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
				"endCharIndex" : charIndex
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
