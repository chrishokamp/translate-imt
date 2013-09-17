// Deployment options
// console.log = function() {};

$(document).ready( function() {
	typingState = new TypingState();
	typingModel = new TypingModel({ "state" : typingState });
	typingUI = new TypingUI({ "model" : typingModel });
		
	typingState.on( "token", updateTranslation );
	d3.select( "#tgt-input" ).on( "keyup", function() { typingState.setUserText( d3.event.srcElement.value ) } );
	initEventHandlers();
});


var updateUI = function(data, elapsedRequestTime) {
	console.log(data);
	$('#output').empty();
	for (var i = 0; i < data.tgtList.length; i++) {
		$('#output').append('<p>' + data.tgtList[i] + '</p>');
	}
	$('#output').append('<span style="font-size:small;color:red">request: ' + elapsedRequestTime.toFixed(2).toString() + 's</span>');

	// Load top MT into the Typing UI
	var mtText = data.tgtList[0];
	var userText = typingState.getUserText();
	var futureText = mtText.substr( userText.length );
	typingState.setFutureText( futureText );
};


var sendTranslationMessage = function(msg, callback) {
  var startTime = Date.now();
  $.ajax({
		url: _serverURL,
		dataType: "json",
		data: {tReq : JSON.stringify(msg), },
		success: function(data){
			var totalTime = (Date.now()-startTime) / 1000;
      callback(data, totalTime);
		},
		error: function(jqXHR, textStatus, errorThrown){
			console.log("Translation request failed");
			console.log(errorThrown);
		},
	});
};


var updateTranslation = function() {
	// Get source text
	var source = $('#src-input').val();
		
	// Get user-entered target prefix
	var tgtPrefix = typingState.getUserText();

	// Translation message
	var msg = {
		src : _srcLang,
		tgt : _tgtLang,
		n : 3,
		text : source,
		tgtPrefix : tgtPrefix,
	};

  sendTranslationMessage(msg, updateUI);
};


var initEventHandlers = function() {
	$('#src-input').change(function(e) {
    updateTranslation();
	});
}