TranslateUI 
===========

TypingUI: Initialization
------------------------

Load javascript files (from subfolder "js"):

	<script type="text/javascript" src="js/d3.js"></script>
	<script type="text/javascript" src="js/jquery.js"></script>
	<script type="text/javascript" src="js/underscore.js"></script>
	<script type="text/javascript" src="js/backbone.js"></script>
	<script type="text/javascript" src="js/ElphabaModel.js"></script>
	<script type="text/javascript" src="js/TypingState.js"></script>
	<script type="text/javascript" src="js/TypingModel.js"></script>
	<script type="text/javascript" src="js/TypingUI.js"></script>

On page load, create an instance of the visualization:

	<script type="text/javascript">
	$(document).ready( function() {
		typingState = new TypingState();
		typingModel = new TypingModel({ "state" : typingState });
		typingUI = new TypingUI({ "model" : typingModel });
	});
	</script>

Insert into the the body of HTML document:

	<div class="TypingUI"></div>

To update the visualization, call one of the following three functions:

	<script type="text/javascript">
		var userText = "Beim Letzteren kann es zu Verlusten beim Gedankengang , zu unzusammenhängenden Sätzen";  // Capture from webpage and replace this string.
		var futureText = "und zu einer Inkohärenz kommen , die sich in schweren Fällen als Wortsalat äußert .";  // Received from server
		var suggestions = [ "Saetzen", "Hello World", "suggested term", "another suggested term" ];              // Received from server
		typingState.setUserText( userText );
		typingState.setFutureText( futureText );
		typingState.setSuggestions( suggestions );
	</script>

