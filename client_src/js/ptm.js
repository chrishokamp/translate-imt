// Deployment options
// console.log = function() {};

var PTM = function() {};

PTM.prototype.run = function() {
	this.server = new TranslateServer();

  // TODO(spenceg): Replace with document selected by server.
  var docId = Math.floor(Math.random() * (3 - 1 + 1)) + 1;
  var docName = "data/en-source." + docId + ".json";

  this.sourceBox = new SourceBox( docName, function() {} , this.server.wordQuery.bind(this.server));
	this.sourceBox.render( "source" );
	
	this.sourceBox.on( "initialized", function() {
		this.typingStates = {};
		this.typingModels = {};
		this.typingUIs = {};
		var segmentKeys = _.keys(this.sourceBox.segments)
		for ( var i in segmentKeys ) {
			var segmentKey = segmentKeys[i];
			var typingState = new TypingState();
			var typingModel = new TypingModel({ "state" : typingState });
			var typingUI = new TypingUI({ "model" : typingModel, "el" : ".TypingUI" + segmentKey });
			this.typingStates[segmentKey] = typingState;
			this.typingModels[segmentKey] = typingModel;
			this.typingUIs[segmentKey] = typingUI;
		}
		for ( var i in segmentKeys ) {
			var segmentKey = segmentKeys[i];
			this.initTranslation(segmentKey);
			this.typingStates[segmentKey].on( "syncTranslation", this.updateTranslation(segmentKey) );
		}
	}.bind(this) );
};

/**
 * Initialize TypingUI.
 **/
PTM.prototype.initTranslation = function( segmentKey ) {
	var handler = function( translations ) { this.typingStates[segmentKey].updateTranslation( translations ) };
	var sourceText = this.sourceBox.segments[segmentKey];
	this.server.translate( sourceText, "", handler.bind(this) );
};

/**
 * Update TypingUI.
 * @param {Object} syncKey An arbitrary identifier that is unique for each request. Pass back to TypingUI to ensure synchronization.
 **/
PTM.prototype.updateTranslation = function( segmentKey ) {
	var f = function( syncKey ) {
		var handler = function( translations ) { this.typingStates[segmentKey].syncTranslation( syncKey, translations ) };
		var sourceText = this.sourceBox.segments[segmentKey];
		var targetPrefix = this.typingStates[segmentKey].getUserText();
		this.server.translate( sourceText, targetPrefix, handler.bind(this) );
	}.bind(this);
	return f;
};