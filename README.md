#jQuery.my

__A plugin for jQuery that binds HTML controls with underlying javascript object in declarative MVVM style. In real-time.__

jQuery.my recognizes standard HTML controls as well as composite controls rendered by jQuery Mobile, several jQuery UI widgets, Redactor, Ace, CLEditor, Select2 and others. 

Comprehensive validation, conditional formatting and dependencies resolution are available. Forms can be nested – each $.my instance can be used as control for a parent form if any.

jQuery.my also incorporates simple template engine.

See [jquerymy.com/api](http://jquerymy.com/api) for more detailed API, examples and list of compatible controls.

##Setup

jQuery.my requires jQuery 1.9+ and [SugarJS 1.3.9+](http://sugarjs.com/). 

```html
<script src="/js/sugar.min.js"></script>
<script src="/js/jquery.min.js"></script>
<script src="/js/jquery.my.min.js"></script>
```
##Quick start
Lets imagine some underlying form.
```html
<div id="form">
	<div><input id="name" type="text" /></div>
	<div><input id="age" type="number" /></div>
</div>
```	
To bind this form with some object `person` we just write
```js
var person = { name:"John", metrics:{ age:20 }};
$("#form").my({
	ui:{
		"#name": "name",
		"#age" : "metrics.age"
	}
}, person);
```	
Now form inputs are filled with init values and any interaction with controls is immidiately pushed into `person` object. Above syntax is a shorthand for

```js	
$("#form").my({
	ui:{
		"#name": { bind: "name" },
		"#age" : { bind: "metrics.age" }
	}
}, person);
```
Dot notation of deep-level bindings is just syntax sugar. It also can be used with arrays in style like `someArray.1`.

First param passed to $.my denoted below as __manifest__.

##Retrieving and updating data
__To get__ form data just read value of the `person` variable or read `$("#form").my("data")`. Second way is good if $.my was initialized without any init value passed. 

__To put__ new data into already initialized instance of $.my call `$("#form").my("data", {name: "Mike"})`. Note you can update data partially. Form is redrawn and revalidated after applying new data .

##More complex data bind
Manifest allows `bind` to be a bi-directional function. It receives entire data object and new value as params. If `null` is passed the function must only return value for DOM control, otherwise function must put value into data object and then return value for DOM.
```js
$("#form").my({
	ui:{
		"#name": "name",
		"#age" : {
			bind: function (data, value, $control) {
				if (value != null) data.metrics.age = value; 
				return (data.metrics.age + "").replace(/\D/g,"");
			}
		}
	}
}, person);
```
Note bind function in example won't allow to input anything than number. Pressing non-num key will do nothing with input, non-num chars are stripped immidiately.

Third param – `$control` – is jQuery obj reference to the control processed.

##Validation
There are several ways to validate data. Control's validator can be a regexp or a function. Functions unlike regexps can return custom error messages depending on value being checked.

If value is incorrect `my-error` class is applied to the closest container of the control, otherwise this style rule is removed. 

If control is not interactive – we bind some data with `<div>` element for example – `my-error` class is applied to the element itself, not container.

Check is performed _before_ bind.

####RegExp validation
```js
$("#form").my({
	ui:{
		"#name": { bind: "name", check:/^[a-z]{10}$/i},
		"#age":  { bind: "metrics.age" }
	}
});
```
If user puts something other than 10-letter combination into `#name` input, `class` attribute of the parent `<div>` is set to `my-error`. 

####Validating with function
Validator function receives same params as bind but executed before bind. Validator must return error message string – or empty string if value is ok.
```js
$("#form").my({
	ui:{
		"#name": { 			
			bind: "name", 
			check: function (data, value, $control) {
				if (value.length > 20) return "Too long name"; 
				if (!/^[a-z]+$/.test(value)) return "Only letters allowed"; 
				return "";
			}			
		},
		"#age": "age"
	}
});
```
Messages returned by validator will be dislayed in DOM element with class `my-error-tip` which must be located inside the control's container. So to make messages visible we must explicitly add this element into html.
```html
<div>
	<input id="name" type="text" />
	<span class="my-error-tip"></span>
</div>
```	
####Checking form has no errors
`$("#form").my("errorrs")` returns object, which keys are invalid fields and their values are error messages. If all the fields are ok `{}` is returned.

To spot whether entire data is valid or not call `$("#form").my("valid")`.
	
##Dependencies
Imagine form that calculates product of two values. We need to recalculate product each time any of factors changes.
```js
$("#form").my({
	ui:{
		"#factor1": "num1", 
		"#factor2": "num2",
		"#product": {
			bind: function (data) {
				return data.num1 * data.num2;
			},
			watch: "#factor1,#factor2" //shorthand for ["#factor1", "#factor2"]
		}
	}
});
```
Product is not mapped to data – bind function does not save anything. It only returns value to put in `#product` DOM element. Every time `#factor1` or `#factor2` receive input `#product` is recalculated.

There is another syntax to define dependecies.
```js
$("#form").my({
	ui:{
		"#factor1": {
			bind: "num1", 
			recalc: "#product"
		},
		"#factor2": "num2",
		"#product": {
			bind: function (data) {return data.num1 * data.num2},
			watch: "#factor2"
		}
	}
});
```
It behaves in same way. Note that `recalc` is processed prior to `watch`. So if a field depends on some other fields via both `recalc` and `watch` attributes, recalcs go first.

Loop dependencies are resolved correctly.

##Conditional formatting and disabling
$.my can apply different classes depending on data object state.
```js
$("#form").my({
	ui:{
		"#name": { 			
			bind: "name", 
			recalc: "#age",
			css: {
				"orange":/^.{10}$/
			}	
		},
		"#age": {
			bind: "age",
			css:{
				":disabled": function (data, value) {
					return data.name.length == 0;
				}
			}
		}
	}
});
```
Here if `#name` is exactly 10 chars, its container will receive class `orange`. If value doesn't match regexp then class `orange` is removed.

Input `#age` depends on value of `#name` field and is disabled if `data.name` is empty.

Conditional formatting over appropriate field is applied after `check` and `bind`.

##Tuning behavior
####Events
$.my knows many types of controls and automatically selects appropriate event handler(s) to provide real-time binding. It's a kind of device driver for different plugins and conventional HTML inputs or noninteractive elements.

But sometimes you need no realtime response – in case of buttons or links for example. Bind function must be executed only when button is really clicked, not while initializing. 
```js
$("#form").my({
	ui:{
		"#button": { 			
			bind: function (data, value) {
				if (value != null) {
					//do something
				}
			}, 
			events: "click,dblclick"	
		}
	}
});
```
The `events` attribute here defines that bind executed after click or doubleclick events on `#button` element. Note bind returns `undefined` here – this syntax allows us to keep control's content intact. 
####Delays
There are several cases bind function must have kind of an anti-jitter. If control is jQuery.UI Slider or conventional HTML5 `<input type="range">` it's reasonable to execute bind only after slider stopped. Complex bind function executed every pixel slider moves can be real CPU and RAM hog.
```js
$("#form").my({
	ui:{
		"#slider": { 			
			bind: function (data, val) { /* do somth*/ }, 
			delay: 150	
		}
	}
});
```
In this example bind function is executed only after last event within 150ms. If change events are raised more often then one in 150ms, they are supressed. See [live demo](http://jquerymy.com/s/delay078.html) – its much more clear than description.

##Preparing form during initialization
If underlying form is just a HTML carcass it's good idea to enrich it during $.my instance initialization without any code outside the manifest.
```js
$("#form").my({
	ui:{
		"#range": { 	
			init: function ($control) {
				$control.slider(range: true, min: 0, max: 100);
			},	
			bind: "range"
		}
	}
});
```
Here we apply jQuery.UI Slider plugin over `#range` control. Data attribute `range` will receive array of two values – slider start and stop. 

Moreover HTML carcass itself can be generated using `init` function, placed as child of manifest's root. The firstmost example can be rewritten in this way:
```js
var person = {}, manifest = {
	data: { name:"John", age:20},
	init: function ($form) {
		$form.html( 
			'<div><input id="name" type="text" /></div>' +
			'<div><input id="age" type="number" /></div>'
		);
	},
	ui:{"#name": "name", "#age": "age"}
};
$("#form").my(manifest, person);
```
Now we can apply manifest over empty `<div>` – form will be rendered and initialized with default data (`data` attribute of the manifest).


##Reusable code snippets
Some functions or fields inside manifest can contain code with matching fragments. It can be same regexps for different fields, or some dictionaries used here and there etc. They can be stored at manifest's root and acessed from `ui` section members by reference.
```js
$("#form").my({
	NumCheck:/^\d+$/,
	ForbiddenPasswords:["123","qwerty"],
	ui:{
		"#num": { 	
			bind: "num",
			check: "NumCheck"
		},
		"#pwd":{
			bind:"password",
			check: function (data, value) {
				var pwdList = this.ForbiddenPasswords;
				if (pwdList.indexOf(value) == -1) return "Too simple password!";
				return "";
			}
		}
	}
});
```
Not only checks but every function defined receives `this` pointing to manifest when called. 

##Settings
Below parameters of $.my instance can be tuned for an entire form:
```js
var manifest = {
	params:{
		delay: 0,		//global anti-jitter delay, can be overriden
		depth: 2,		//depth of chained/looped recalc resolution
		errorTip: ".my-error-tip",		//jQuery selector for error msg
		errorCss: "my-error"			//class to mark invalid controls
	},
	data: {...},
	init: function ($form) {...},
	ui:{...}
};
```
##Manifest delivery
There is buil-in method to convert manifest with functions and regexps into conventional JSON. It's useful for on-demand manifest delivery using ajax calls. `$.my.tojson(manifest)` returns correct JSON-encoded string with all functions and regexps converted to strings.

This approach is used in CouchDB to store internal functions as JSON docs. It's quite simple and straightforward.
```
$.my.tojson({
	a:function(){}, 
	b:/./
})  
>> '{"a":"function (){}", "b":"new RegExp(/./)"}'
```	
Method `$.my.fromjson(someJSON)` unwinds encoded functions and regexps into full-featured code.

There is no need to decipher encoded manifests before passing them to $.my – they are unwinded automatically.

##Compatibility
Works fine on IE8+ and other browsers. IE7 requires external JSON library.
