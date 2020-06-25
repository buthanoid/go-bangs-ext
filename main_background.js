var bangs ; // contains the data. 
var user_input ; // see comments for the function handler_input_enter

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
.then(() => {
	storage_get_key("bangs")
	.then(res_bangs => {
		bangs = res_bangs ;
	});
})
// we establish the extension behaviour, which is
// suggesting urls in the omnibox when the extension keyword is entered
.then(() => {
	browser.omnibox.setDefaultSuggestion({ description: "Go Bangs Ext : enter a bang to suggest a website." });
	browser.storage.onChanged.addListener(handler_storage_change);
	// event handlers on the omnibox (address bar)
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

// called every time the storage changes
// this happen when the user uses the options page actions
function handler_storage_change (changes, areaName) {
	if (areaName != "local") return ;
	if (! changes.hasOwnProperty("bangs")) return ;
	bangs = changes.bangs.newValue ;
}

// called every time the user type something after the extension keyword and a space
function handler_input_change (input_str, make_suggests) {
	
	user_input = input_str ;
	var input = parse_input(user_input) ;
	var filtered_bangs = find_bangs(input.key, bangs);
	
	// we build the suggestions 
	var suggestions = filtered_bangs.map (bang => {
		return build_suggestion (bang, input.param) ;
	}) ;

	make_suggests(suggestions); // we send them to the omnibox
}	

// Called every time the user selects a suggestion.
// Note that the first suggestion is not a suggestion, only a 
// description, this is imposed by the Omnibox API.
// When the first suggestion is selected, the "url" contains the
// user input, for example "y koala", and this is an incorrect url.
// We handle this by checking if the url is exactly 
// the user input in the omnibox (minus the extension keyword).
// If it is the case, we try to load the first suggestion.
// If the "url" does not match the user input, we assume it is correct and load.
function handler_input_enter (url, disposition) {
	
	if (url == user_input) { // true when user selects default suggestion,
		// see comments above
		var input = parse_input(user_input) ;
		var filtered_bangs = find_bangs(input.key, bangs);
		if (filtered_bangs.length < 1) return ;
		var suggestion = build_suggestion(filtered_bangs[0], input.param);
		url = suggestion.content ;
	}
	
	// load the url
	switch (disposition) {
	case "currentTab" : browser.tabs.update({ url }) ; break ;
	case "newForegroundTab" : browser.tabs.create({ url }) ; break ;
	case "newBackgroundTab" : browser.tabs.create({ url, active: false }) ; break ;
	}
}

// Separate the keyword (bang) from the params (optional additional words)
// string -> object{key:string, param:string}
function parse_input (str) {
	var index = str.indexOf(" ");
	if (index == -1) return { key: str, param: "" } ;
	else return {
		key: str.substring(0, index),
		param: str.substring(index + 1)
	};
}

// string, array[array[5 string]] -> array[array[5 string]]
// from a string find the corresponding bangs
function find_bangs (str_key, bangs) {
	// We get the bangs that start with the bang key 
	var filtered_bangs = bangs.filter (bang => {
		return bang[BANG].startsWith(str_key) ;
	}) ;
	return filtered_bangs ;
}

// build a suggestion object from a bang and an optionnal input param
// array[5 string], string -> object{content:string, description:string}
function build_suggestion (bang, param) {
	var description = "(" + bang[BANG] + ") " + bang[LABEL] + " " + param ;
	var content = "" ;
	if (param == "" || bang[URL_BEFORE_PARAM] == "") content = bang[URL_WITHOUT_PARAM] ;
	else content = bang[URL_BEFORE_PARAM] + param + bang[URL_AFTER_PARAM] ;
	return { content: content, description: description };
}