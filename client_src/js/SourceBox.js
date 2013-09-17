// Source textbox for PTM application
function SourceBox(jsonFileName, onChangeCallback) {
  this.jsonFileName = jsonFileName;
  this.curSelection = null;
  this.onChangeCallback = onChangeCallback;
}

SourceBox.prototype.getSourceText = function(event) {
  return $('#'+this.curSelection).text();
};

SourceBox.prototype.layoutCurrentWithTranslation = function(tgtText, alignments) {
  // TODO(spenceg): Alignments of source tokens with 1-best translations
};

SourceBox.prototype.handleSelect = function(event) {
  if (this.curSelection) {
    $('#'+this.curSelection).css('background-color','#FFFFFF');
  }
  $('#'+event.target.id).css('background-color','#E8E8E8');
  this.curSelection = event.target.id;
  this.onChangeCallback();
};

SourceBox.prototype.render = function(targetDiv) {
  // Load json from file and render in target box
  // Add event handlers for each div (for clicking)
  // TODO(spenceg): Tokenize and put each token in a span for rule queries.
  var self = this;
  $.getJSON(this.jsonFileName, function(data) {
    $.each(data.srclist, function(i,val){
      var id = targetDiv + i;
      $('#' + targetDiv).append('<div id="' + id + '">' + val + '</div>');
      $('#'+id).css('margin-bottom','0.5em');
      if (i == 0) {
        $('#'+id).css('margin-top','0.5em');
      }
      $('#'+id).css('cursor','pointer');
      $('#'+id).click(function(event) {
        self.handleSelect(event);
      });
    });
  });
};

