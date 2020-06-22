// if "init" is not in the storage, it means the storage is empty
// it is the case for example when the extension is just installed and
// this script is executed for the first time ever.
// if "init" is not in the storage, the storage is then completed by
// using the default value found in "default_bangs_data.json"
storage_get_key("init")
.catch(err => {
	if (err.value == E_MISSING_KEYS)
		return init ();
	else throw err ;
})
// when we have dealt with init, we establish 	the extension behaviour
// which is suggesting urls in the omnibox when the extension keyword is entered
.then(() => {
	browser.omnibox.setDefaultSuggestion({ description: "Go Bangs Ext : enter a bang to suggest a website." });
	// event handlers on the omnibox (address bar)
	browser.omnibox.onInputStarted.addListener (handler_input_start) ;
	browser.omnibox.onInputChanged.addListener (handler_input_change) ;
	browser.omnibox.onInputEntered.addListener (handler_input_enter) ;
});

function init () {
	// we load the file "default_bangs.json"
	// and put its content in the storage, under the key "bangs"
	// we also put the key "init" to true, to avoid init every
	// time this script (main_background.js) is called
	return xhr_get_json("default_bangs.json")
		.then (default_bangs => {
			return storage.set ({ 
				bangs: default_bangs.sort(), init: true, modified: false }) ;
		});
}

var bangs ; // contains the data. shared between the handlers.
var loaded = false ; // says if bangs have been loaded. shared between the handlers.

// called when the user type the extension keyword and a space in the omnibox
function handler_input_start () {
	// we refresh the bangs each time the input is started.
	// This is used to take account of the changes in the storage which
	// can be made from the options page.
	// It is assumed that it is light in terms of memory and time to do this.
	// Surely there is a better way to do it.
	// We could also read the bangs only once when this script (main_background.js) is
	// called, but that would impose to restart the browser every
	// time we change the options and want to see the changes.

	loaded = false ; // used to prevent "handler_input_change" to read variable "bangs" before it is written
	storage_get_key("bangs")
	.then(res_bangs => {
		bangs = res_bangs ;
		loaded = true ;
	});
}

// called every time the user type something after the extension keyword and a space
function handler_input_change (input_str, make_suggests) {
	
	// if "handler_input_start" has not written the bangs yet,
	// we do nothing but will return soon and surely it will be written
	if (! loaded) {
		setTimeout (() => { handler_input_change (input_str, make_suggests) }, 100) ;
		return 
	}
	
	// Separate the keyword (bang) from the params (optional additional words)
	var input_keyword, input_param ;
	var index = input_str.indexOf(" ");
	if (index == -1) {
		input_keyword = input_str ;
		input_param = "" ;
	}
	else {
		input_keyword = input_str.substring(0, index) ;
		input_param = input_str.substring(index + 1);
	}
	
	// We get the bangs that start with the input key 
	var filtered_bangs = bangs.filter (bang => {
		return bang[BANG].startsWith(input_keyword) ;
	}) ;
	
	// we build the suggestions 
	var suggestions = filtered_bangs.map (bang => {
		var url_str ;
		if (input_param == "" || bang[URL_BEFORE_PARAM] == "") 
			url_str = bang[URL_WITHOUT_PARAM] ;
		else url_str = bang[URL_BEFORE_PARAM] + input_param + bang[URL_AFTER_PARAM] ;
		var description = "(" + bang[BANG] + ") " + bang[LABEL] + " " + input_param ;
		return { content: url_str, description: description };
	}) ;

	make_suggests(suggestions); // we send them to the omnibox
}	

// Called every time the user selects a suggestion.
// Note that the first suggestion is a special one that do not trigger this handler.
// It is imposed by the API I would gladly remove this special one.
// I took this function from Mozilla Tutorial,
// its point is just to create the tab in the way the user wanted
function handler_input_enter (url, disposition) {
	switch (disposition) {
	case "currentTab" : browser.tabs.update({ url }) ; break ;
	case "newForegroundTab" : browser.tabs.create({ url }) ; break ;
	case "newBackgroundTab" : browser.tabs.create({ url, active: false }) ; break ;
	}
}