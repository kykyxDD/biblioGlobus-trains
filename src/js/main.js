function interpolate(str, dat) {
	function sub(s, name) { return dat[name] || '' }
	return str.replace(/#\{([^}]+)}/g, sub)
}
function not(fn) {
	return function _not(item) {
		return !fn(item)
}}
function property(name) {
	return function _property(item) {
		return item[name]
}}
function method(name) {
	return function _method(item) {
		return item[name]()
}}
function numeric(name) {
	return function _numeric(one, two) {
		return one[name] - two[name]
}}
function make(construct) {
	return function _make(item, index) {
		return new construct(item, index)
}}
function bytes(val) {
	var exp = +val.toExponential().split('e')[1] / 3 |0
	return hround(val / (1 << exp * 10)) + ' KMGT'[exp]
}
function add_class(elem, name) {
	if(!has_class(elem, name)) elem.className += ' '+ name
}
function rem_class(elem, name) {
	return elem.className = elem.className.replace(name, '').replace(/\s+/g, ' ')
}
function has_class(elem, name) {
	return ~elem.className.indexOf(name)
}
function min(ary) { return Math.min.apply(0, ary) }
function max(ary) { return Math.max.apply(0, ary) }
function rand(limit) { return Math.random() * (+limit || 1) |0 }
function hround(val) { return (val * 100 +.5|0) / 100 }
function hash(value) {
	return String.fromCharCode.apply(0, (value +'').split('').map(function(e) {
		return e.charCodeAt() }).map(function(e, i, a) {
		return value = ((Math.abs(a.slice(i).concat(a.slice(0, i)).reduce(function(v, e, i) {
			return v + e / ++i * (i % 2 ? -1 : 1) }, e)) ^ value) % 0x5e |0) + 0x21
	}))
}
setTimeout(function(support) {
	var st = setTimeout
	if(!support) setTimeout = function(fn, delay) {
		var args = [].slice.call(arguments, 2)
		return st(function() { fn.apply(null, args) }, delay)
	}
}, 0, true)
!function(x,y) {
	function on(e) {
		e = e.touches ? e.touches[0] : e
		x = e.pageX
		y = e.pageY
	}
	function off(e) {
		e = e.changedTouches ? e.changedTouches[0] : e
		x = Math.abs(e.pageX - x)
		y = Math.abs(e.pageY - y)
		if(x <3 && y <3) {
			var tap = document.createEvent('CustomEvent')
			tap.initCustomEvent('tap', true, true, e)
			e.target.dispatchEvent(tap)
		}
	}
	document.addEventListener('mousedown',  on, true)
	document.addEventListener('mouseup',   off, true)
	document.addEventListener('touchstart', on, true)
	document.addEventListener('touchend',  off, true)
}()
Object.defineProperty(Number.prototype, 'toDigits', { value: function(n) {
	var k = (this +'').length
	return Array(Math.max(n, k - 1) - k + 1).join('0') + this
}})
Object.defineProperty(Number.prototype, 'px', { get: function() { return this +'px' }})
Object.defineProperty(Object.prototype, 'copy', { value: function() {
	[].slice.call(arguments).some(function(obj) {
		if(obj && typeof obj === 'object')
			for(var prop in obj) this[prop] = obj[prop]
	}, this)
	return this
}})
Object.defineProperty(Array.prototype, 'select', { value: function(prop, val) {
	for(var i = 0, l = this.length; i < l; i++)
		if(this[i] && this[i][prop] == val)
			return this[i]
}})
Object.defineProperty(Array.prototype, 'group', { value: function(func, scope) {
	var ary = [], i = -1, l = this.length, group
	while(++i < l) {
		group = func.call(scope, this[i], i, this)
		if(isNaN(group)) group = 0
		if(!ary[group]) ary[group] = []
		ary[group].push(this[i])
	}
	return ary
}})

var seats, decks, groups, masks, map, tiles, item_timeout,
    current_car = {},
	frames = {},
	cookie = {},
	params = {},
	interval = [];

var debug = {
	enabled : false,
	token   : 'Hx""$$#(073635',
	mouse   : {},
	scale   : 1,

	hotkey: function(e) {
		if(debug.enabled) switch(String.fromCharCode(e.keyCode)) {
			case '0': navigation.move(0)                   ;break
			case '1': navigation.move(1)                   ;break
			case '+': frames.view.zoom(debug.scale += 0.2) ;break
			case '-': frames.view.zoom(debug.scale -= 0.2) ;break
		}
	},
	hover: function(seat) {
		var prev = this.hover.previous

		if(this.enabled) if(prev !== seat) {
			el.plane.style.cursor = seat ? 'pointer' : 'default'

			prev && prev.hover(false)
			seat && seat.hover(true )
			this.hover.previous = seat
		}
	},
	mousedown: function(e) {
		if(debug.enabled) {
			debug.mouse.down = true
			debug.mouse.sx   = e.pageX
			debug.mouse.sy   = e.pageY
		}
	},
	mousemove: function(e) {
		if(debug.enabled) {
			var seat = Seat.findByPosition(e.offsetX, e.offsetY)

			debug.hover(seat)

			if(debug.mouse.down) {
				debug.mouse.dx = e.pageX - debug.mouse.sx
				debug.mouse.dy = e.pageY - debug.mouse.sy
			}
		}
	},
	mouseup: function(e) {
		if(debug.enabled) {
			debug.mouse.down = false
		}
	}
}
var view = {
	loading: '',
	orient : '',
	decker : '',
	upper  : false,
	user   : null,
	passengers_visible: false,
	small  : false,
	lower_deck_class: '',
	upper_deck_class: '',
	group_ticket: '',
	debug  : {
		pos_nav : 0,
		pos_view: 0
	},
	plane: {
		width : 0,
		height: 0
	}
}

var el = {
	view     : '.view',
	plane    : '.plane',
	nav      : '.nav',
	logo     : '.airline-logo',
	nav_logo : '.airline-logo-small',
	frame    : '.frame',
	fly      : '.fly',
	result   : '.popup.done',
	error    : '.popup.fail',
	progress : '.background .caption',
	current  : '.selection',
	label    : '.selection .label'
}

var C = {
	GROUP_SIZE    : 38,
	PROGRESS_FAKE : 0.4,
	DEBUG         : false,
	DEMO          : false
}


// location.search.substr(1).split('&').filter(Boolean).some(store_pair, params)
// document.cookie.split(/; ?/).some(store_pair, cookie)
// function store_pair(pair) {
// 	pair = pair.split('=')
// 	this[pair[0]] = pair[1]
// }
window.addEventListener('load', ready, false)

function ready() {
	for(var name in el) el[name] = document.querySelector(el[name])
	!function observe(tree) {
		for(var name in tree) {
			if('function' === typeof tree[name]) {

			} else if(tree[name] && 'object' === typeof tree[name]) {
				observe(tree[name])
			} else {
				tree[name] = ko.observable(tree[name])
			}
		}
	}(view)
	el.sound = document.createElement('audio')
	el.sound.src = BASE_URL + 'click.mp3'
	el.sound.load()

	C.VIEWONLY = C.DEMO = params.tourid == 'SEATMAP'
	C.DEMO = !!params.demo
	debug.enabled = hash(params.debug) === debug.token

	document.body.style.display = 'block'
	view.groups_users = ko.observableArray();

	model.loadConfig(loading_error)
	model.resourcesProgress = progress
	model.resourcesLoaded = function() {
		clearInterval(refresh.interval)
		el.progress.textContent = 'Загрузка...'
		start()
	}

	var begin = new Date
	progress.fake = progress.real = 0
	refresh.interval = setInterval(function() {
		progress.fake = Math.min(C.PROGRESS_FAKE, (new Date - begin) / 1000 * 0.01)
		refresh()
	}, 1000 / 60)
	function progress(done, all) {
		progress.real = done / all
		refresh()
	}
	function refresh() {
		var show = progress.real * (1 - C.PROGRESS_FAKE) + progress.fake
		el.progress.textContent = (show * 100 |0) +'%'
	}
	function loading_error(error) {
		clearInterval(refresh.interval)
		el.progress.textContent = error.message
	}
	

	
}
function start() {

    prepare_train_view()

	decks = model.struct.plane.decks.map(make(Deck))
	masks = model.struct.masks.map(make(Mask))
	seats = model.struct.seats.map(make(Seat)).sort(numeric('y'))
	map   = new Map(model.struct.map.gray, model.struct.map.color)

	function    spray(e, i) { return e.group(by_index)   }
	function  by_deck(e, i) { return e.deck > 1 ? 1 : 0  }
	function by_index(e, i) { return i / C.GROUP_SIZE |0 }
	function  by_axis(a, b) { return (a.x - b.x) * axis[0] + (a.y - b.y) * axis[1] }
	
	// calculate ship axis normalized vector
    var p1 = model.struct.plane.point1
    var p2 = model.struct.plane.point2
    var vect = V(p1[0] - p2[0], p1[1] - p2[1])
    var vect_l = vect.length
    vect.x /= vect_l
    vect.y /= vect_l
    
	var axis = [-vect.y, -vect.x]//[-0.46, 0.89]
	groups = seats.slice().sort(by_axis).group(by_deck).map(spray)
	groups = groups[0].concat(groups[1] || []).map(make(SeatGroup))

	tiles = [].concat.apply([], decks.map(property('tiles'))).concat(groups, masks)
	tiles.some(function(tile) { tile.p = decks[tile.d].elem })

	if(C.DEMO || C.VIEWONLY) {
		add_class(el.logo, 'static-'+ model.airline)
	} else {
		add_class(el.nav_logo, 'static-'+ model.airline +'-small')
	}

	setup_viewmodel()
	update_users(model.users)
	model.struct.double_decker && view.hide_upper_deck()
	setup_navigation()
	resize()
	register_events()

	frames.view.zoom(view.small() ? 0.5 : 1)

	view.users().forEach(function(user) {
		Seat.link(user, seats.select('num', user.curseat()))
	})
	groups.some(method('draw'))
	// load_session()

	view.loading('done')
	setTimeout(view.loading, 500, 'void')

    if ('MESSAGE' in model.ticket) {
        view.error(model.ticket.MESSAGE)
    }
}

function prepare_train_view() {
    
    view.current_car = ko.observable(current_car)
    
    view.prev_car_item = ko.observable(false)
    view.prev_car_type = ko.observable('')
    view.prev_car_num = ko.observable('')

    view.current_car_type = ko.observable('')
    view.current_car_num = ko.observable('')
    view.current_car_descr = ko.observable('')
    view.current_car_carrier = ko.observable('')
    view.current_car_prime_from = ko.observable('')
    view.current_car_prime_to = ko.observable('')
    
    view.next_car_item = ko.observable(false)
    view.next_car_type = ko.observable('')
    view.next_car_num = ko.observable('')

    navigation.position = V(0.2, 0.2)
    var update_nav_interval = setInterval(update_view, 200)
    view.scroll_prev_to_car = function() {
        
        var cars = model.ticket.TRAIN.CAR
        var ind = calc_current_car_index() - 1
        if (ind < 0) ind = 0
        var pos = (ind + 0.5) / cars.length

        navigation.stop_glide()
        navigation.move(V(pos, pos))
        
        update_view()
    }

    view.scroll_next_to_car = function() {
        
        var cars = model.ticket.TRAIN.CAR
        var ind = calc_current_car_index() + 1
        if (ind >= cars.length) ind = cars.length - 1
        var pos = (ind + 0.5) / cars.length
        
        navigation.stop_glide()
        navigation.move(V(pos, pos))
        
        update_view()
    }

}

function calc_current_car_index()
{
    var cars = model.ticket.TRAIN.CAR
    
    var ind = Math.floor(navigation.position.x * cars.length)
    
    return ind
}

function update_view()
{
    var ind = calc_current_car_index()
    
    var cars = model.ticket.TRAIN.CAR
    if(!cars)return
    var car = cars[ind]
    var car_info = model.planes.bus_parts[car.type]

    view.current_car_type(car_info.desc)
    view.current_car_num("Вагон №" + car.num)
    view.current_car_descr(car.DESCR.text)
    view.current_car_carrier(car.CARRIER)
    view.current_car_prime_from(car.PRICE.from)
    if(car.PRICE.to !== '') {
    	view.current_car_prime_to(car.PRICE.to)
    } else {
    	view.current_car_prime_to(false)
    }

    current_car.type = car_info.desc
    current_car.num = car.num
    
    if (ind > 0) {
    	view.prev_car_item(true)
        car = cars[ind-1]
        car_info = model.planes.bus_parts[car.type]
        view.prev_car_type(car_info.desc)
        view.prev_car_num("Вагон №" + car.num)
    }
    else {
    	view.prev_car_item(false)
        view.prev_car_type("")
        view.prev_car_num("")
    }
    
    if (ind < cars.length-1) {
    	view.next_car_item(true)
        car = cars[ind+1]
        car_info = model.planes.bus_parts[car.type]
        view.next_car_type(car_info.desc)
        view.next_car_num("Вагон №" + car.num)
    }
    else {
    	view.next_car_item(false)
        view.next_car_type("")
        view.next_car_num("")
    }
}


function load_session() {
	var users = view.users()

	if(cookie.tour !== encodeURIComponent(SEATS_INFO_URL)) {
		cookie = {}
	}
	if(cookie.seats) {
		users.some(function(user, index) {
			var seat = seats.select('num', this[index]);
			if(!seat.user) {
				Seat.unlink(user)
				Seat.link(user, seats.select('num', this[index]))
			}
		}, cookie.seats.split(':').map(function(seat, index, seats) {
			return seats.indexOf(seat) === index ? seat : ''
		}))
	}

	cookie.index && view.selectUser(users[cookie.index])
		|| users.some(view.selectUser)
		|| console.log('all users disabled')

	view.save_session = ko.computed(function() {
		var expire = '; expires='+ new Date(2 * 24 * 60 * 60 * 1000 + new Date)
		document.cookie = 'tour='+ encodeURIComponent(SEATS_INFO_URL) + expire
		document.cookie = 'index='+ view.users().indexOf(view.user()) + expire
		document.cookie = 'seats='+ view.users().map(method('curseat')).join(':') + expire
	})
	view.delete_session = function() {
		document.cookie = 'tour=; expires='+ new Date(0)
		document.cookie = 'index=; expires='+ new Date(0)
		document.cookie = 'seats=; expires='+ new Date(0)
	}

	updateDisable()

}
function setup_viewmodel() {
	document.title = model.boardinfo.name

	view.show_passengers = function() { Seat.togglePassengers(true ) }
	view.hide_passengers = function() { Seat.togglePassengers(false) }
	view.show_upper_deck = function() { upper_deck_visible(true )    }
	view.hide_upper_deck = function() { upper_deck_visible(false)    }

	function upper_deck_visible(visible) {
		view.upper(visible)
		clearTimeout(item_timeout)

		if(visible) {
			view.lower_deck_class('static-deck_ina')
			view.upper_deck_class('static-deck_act selected')
			rem_class(decks[1].elem, 'hidden')
			if(decks[1].huge) {
				add_class(decks[0].elem, 'hidden')
				item_timeout = setTimeout(add_class, 500, decks[0].elem, 'void')
			} else {
				// navigation.move(model.upper_pos, true)
				var point = model.struct.plane.point1
				frames.view.move(point[0], point[1], true)
			}
		} else {
			view.lower_deck_class('static-deck_act selected')
			view.upper_deck_class('static-deck_ina')
			add_class(decks[1].elem, 'hidden')
			if(decks[1].huge) {
				rem_class(decks[0].elem, 'void')
				setTimeout(rem_class, 0, decks[0].elem, 'hidden')
			}
		}
	}

	view.decker(model.struct.double_decker ? 'double-decker' : 'single-decker')

	view.board = model.boardinfo
	view.board.time = /(\d+?)(\d\d)$/.exec(view.board.takeoff_time).slice(1).join(':')
	view.formatAirport = function(data) {
		return data.port_rus + " " + data.port
	}

	view.item_group = ko.observable(false)
	view.users = ko.observableArray()
	view.placedUsers = ko.computed(function() {
		return view.users().filter(method('curseat'))
	}, view)
	view.selectUser = function(user, e) {
		if(user && (!user.parent || (user.parent && user.parent.seat)) && !user.disabled) {
			var previous = view.user()
			if(previous) {
				previous.selected(false)
			}
			view.user(user)
			user.selected(true)
			if(!previous || user.sc !== previous.sc || user.sex !== previous.sex 
				|| user.child || user.parent || (previous.parent || (!user.child))) {
				groups.some(method('draw'))
			}
			if(user.seat) {
				if(model.struct.double_decker) {
					upper_deck_visible(user.seat.deck > 1)
				}
				frames.view.move(user.seat.x, user.seat.y, true)
			}
			if(e && previous && user.id == previous.id){
				var elem = e.target || e.srcElement;
				if(elem.tagName == 'TD' && has_class(elem, 'ok')) {
					user.seat && user.seat.take(user);
				}
			}
			updateDisable()


			return true
		}
	}
	view.clickGroup = function(str, index, data){
		if (str == 'rem') {
			GroupsUsers.remGroup(data, index)
		} else if (str == 'set'){
			GroupsUsers.setGroup(data, index)
		}
	}
	view.addGroup = function(){
		GroupsUsers.createGroup();
	}
	view.clickUser = function(data, parent){
		if(view.item_group() == false) return
		
		if(data.d_check() == false)  {
			GroupsUsers.addUser(data)
		} else if(data.d_check() == true) {
			if(data.id_group() == view.item_group().id) {
				GroupsUsers.addUser(data) 
			} 
		}
	}
	view.changeSelectParent = function(data){
		if(data.id !== view.user())
		var user = view.user();
		var select = event.target || event.srcElement;
		var val = view.list_parent()[select.selectedIndex];

		if(val.child && val.child.indexOf(user) >= 0) return

		if(user.parent && user.parent.child) {
			user.parent.child.remove(user);	
		}
		user.sc = val.sc;
		user.parent = val;
		user.fclass_name(val.fclass_name());
		val.child.push(user);
		if(!val.seat) {
			user.block(true);
			user.seat = null;
			user.curseat('');
			user.id_car('');
			C.DEMO || select_next_user() // переключение на следующего user
			view.usersbox_scroll.refresh()
		} else {
			user.block(false)
			if(!user.seat || user.seat.id.split('-')[0] !== val.seat.id.split('-')[0]) {
				user.seat = null;
				user.curseat('')
				user.id_car('')
			}

		}
		updateDisable()
	}
	view.clickSelectParent = function(data){
		if(data.id !== view.user().id) {
			view.selectUser(data)
		}
	}


	view.airline = ko.observable(model.airline)
	view.classes = ko.observableArray([view.orient, view.decker, view.airline])
	if(debug.enabled) view.classes.push(function() { return 'debug'})
	if(C.DEMO || C.VIEWONLY) view.classes.push(function() { return 'demo' })
    if (C.VIEWONLY) view.classes.push(function() { return 'viewonly' })

	view.root_class = ko.computed(function() {
		return this.classes().map(method('call')).join(' ')
	}, view)

	view.list_parent 	= ko.observableArray()
	view.display_result = ko.observable(false)
	view.result_header  = ko.observable('')
	view.result_text    = ko.observable('')
	view.display_error  = ko.observable(false)
	view.error_message  = ko.observable('')
	view.num_odd   		= ko.observable(0);
	view.num_even  		= ko.observable(0);
	view.error_seat  	= ko.observable(true);
	view.error_len 		= ko.observable(true);
	view.disable_submite = ko.observable(true);

	view.confirm_caption = ko.computed(function() {
		return view.small() ? 'Готово' : 'Зарегистрировать'
	})

	view.submit = function() {
		if(view.placedUsers().length && !view.error_len() && !view.error_seat()) {
			view.loading('done')
			setTimeout(view.loading, 0, 'half')

			model.seatRequest(view.success, view.error)
		} else {
			// console.log('please, place all the users')
		}
	}
	view.success = function(text) {
		update_seats()
		update_users(model.users)
		groups.some(method('draw'))
		view.display_result(true)
		view.result_header(text.head)
		view.result_text(text.body)
		view.register_scroll.destroy()
		view.register_scroll = new iScroll('confirm-users')
	}
	view.error = function(message) {
		view.display_error(true)
		view.error_message(message)
	}
	view.hide_error = function() {
		view.display_error(false)
		view.loading('done')
		setTimeout(view.loading, 500, 'void')
	}
	view.complete = function() {
		view.display_result(false)
		view.loading('done')
		view.selectUser(view.users()[0])
		setTimeout(view.loading, 500, 'void')
	}
	GroupsUsers.createGroup();

	ko.applyBindings(view)
	view.register_scroll = new iScroll('confirm-users')
	view.usersbox_scroll = new iScroll('users-scroll')

	setTimeout(function() { view.usersbox_scroll.refresh() })
}
function make_selection_label() {
	var root = document.createElement('div')
	root.className = 'selection'
	root.innerHTML =
		'<div class="wrap">'+
			'<div data-bind="text: user.curseat" class="label"></div>'+
            '<svg viewBox="0 0 26 26">'+
 				'<path d="M0,0 L26,0 L26,18 L13,26 L0,18 L0,0" />'+
 			'</svg>'+
 		'</div>'

	return { selection: root, label: root.querySelector('.label') }
}
function select_next_user() {
	var users = view.users(),
		index = users.indexOf(view.user()),

		await = users.slice(index).concat(users.slice(0, index)).filter(function(item){
			if(!item.curseat() && !item.block()) return item
		})
	if(await.length) view.selectUser(await[0])
}
function update_seats() {
	var mod = model.struct['seats'];

	mod.forEach(function(info){
		var seat = seats.select('num', info.num);
		if(info.status && info.status !== '*'){
			seat.status = info.status;
			seat.user   = info.user;
		} else if(seat.user && (!info.status || info.status == '*')){
			seat.user = null;
		}
	})
}
function update_users(users) {
	view.user(null)
	if(view.users().length){
		view.users().forEach(function(user){
			if(user.seat) {
				Seat.unlink(user);
			}
		})
	}

	view.list_parent([])

	users.forEach(function(user, index) {
		var seat = seats.select('num', user.curseat)

		user.d_check  = ko.observable(user.d_check  || false)
		user.id_group = ko.observable(user.id_group || false)
		user.seat     = seat
		user.selected = ko.observable(false)
		user.block    = ko.observable(!user.parent ? false : true)
		user.error    = ko.observable(user.error   || '')
		user.curseat  = ko.observable(user.curseat || '')
		user.id_car   = ko.observable(user.id_car  || '')
		user.fclass_name  = ko.observable(user.fclass  || '')
		if(!user.parent && !user.infant) {
			view.list_parent().push(user)
		}

        user.seat_name = ko.computed(function() {
            return user.curseat().replace(/^.*-/, '')
        })

        if(seat) seat.user = user.face[seat.sid]

		user.copy(make_selection_label())
	})

	view.users(users)
	view.selectUser(view.list_parent()[0])
	view.group_ticket(model.group_ticket)
}
function setup_navigation() {
	frames.view = navigation.addFrame(model.struct.plane.size)
	frames.view.updateSize     = resizeView
	frames.view.updatePosition = moveView

	frames.map = navigation.addFrame(model.struct.map.size)
	frames.map.updateSize     = resizeMap
	frames.map.updatePosition = moveMap

	var point1 = model.struct.plane.point1,
		point2 = model.struct.plane.point2,
		loader = new Loader

	frames.view.bounds(point1, point2, 820)

	function moveView(x, y, scale) {
		x = hround(x)
		y = hround(y)

		position(el.plane, -x, -y, scale)

		var w = frames.view.size.x / scale,
			h = frames.view.size.y / scale

		x /= scale
		y /= scale

		// x += w / 4
		// y += h / 4
		// w /= 2
		// h /= 2
		tiles.some(function(o) {
			var show =
				o.x < x + w   &&
				o.y < y + h   &&
				o.x + o.w > x &&
				o.y + o.h > y

			// o.c.style.display = show ? 'block' : 'none'
			if(show) {
				if(o.delayed) {
					loader.image(o.url, function(img) {
						o.delayed = false
						o.c.getContext('2d').drawImage(img, 0, 0)
                        if(debug.enabled) {
                            o.c.getContext('2d').fillStyle = "black"
                            o.c.getContext('2d').fillRect(0, 0, 300, 100)
                            o.c.getContext('2d').fillStyle = "white"
                            o.c.getContext('2d').font = "10px Verdana";
                            o.c.getContext('2d').fillText(o.x + " " + o.y + " " + o.url, 10, 50)
                        }
					})
				}
				o.c.parentNode || o.p.appendChild(o.c)
			} else {
				o.c.parentNode && o.p.removeChild(o.c)
			}
		})

		if(debug.enabled) view.debug.pos_view('('+ [x, y] +')')
	}
	function moveMap(x, y) {
		x = hround(x)
		y = hround(y)

		// one pixel here is for frame border
		position(map.frame,    x,    y)
		position(map.color, -1-x, -1-y)

		if(debug.enabled) view.debug.pos_nav('('+ [x, y] +')')
	}
	function resizeView(width, height) {

	}
	function resizeMap(width, height) {
		map.frame.style.width  = (width  +.5|0).px
		map.frame.style.height = (height +.5|0).px
	}
}

function resize() {
	var orient = window.innerWidth < window.innerHeight,
		plane = model.struct.plane,
		map   = model.struct.map

	view.small(window.innerWidth < 601)
	view.orient(orient ? 'portrait' : 'landscape')
	frames.view.scaleMin = view.small() ? 0.5 : 1

	el.plane.style.width      =   plane.size[0].px
	el.plane.style.height     =   plane.size[1].px
	el.  nav.style.width      =   map.size[0].px
	el.  nav.style.height     =   map.size[1].px
	el.  nav.style.marginLeft = (-map.size[0] / 2).px
	el.  nav.style.marginTop  = (-map.size[1] / 2).px

	var box = el.view.getBoundingClientRect()
	frames.view.resize(box.width, box.height)
}

function register_events() {
	var touch = 'ontouchstart' in window

	var ptr = {
		start : touch ? 'touchstart' : 'mousedown',
		move  : touch ? 'touchmove'  : 'mousemove',
		end   : touch ? 'touchend'   : 'mouseup',
		click : 'tap'
	}

	var plane = document.querySelector('.plane'),
		nav   = document.querySelector('.nav')

	var events = [
	//  event order matters!
	//  [ element , event type , handler  ]
		[ nav     , ptr.start  , moveMap  ],
		[ nav     , ptr.start  , dragMap  ],
		[ nav     , ptr.move   , dragMap  ],
		[ nav     , ptr.end    , dragMap  ],
		[ plane   , ptr.start  , dragView ],
		[ plane   , ptr.move   , dragView ],
		[ plane   , ptr.end    , dragView ],
		[ plane   , ptr.click  , click    ],
		[ window  ,'resize'    , resize   ],
	]

	if(debug.enabled) events.unshift(
		[ window  ,'keypress'  , debug.hotkey   ],
		[ nav     , ptr.click  , debug.click_map],
		[ plane   , ptr.start  , debug.mousedown],
		[ plane   , ptr.move   , debug.mousemove],
		[ plane   , ptr.end    , debug.mouseup  ])

	events.some(function(ev) { ev[0].addEventListener(ev[1], ev[2], false) })

	function dragView(e) {
		var now = e.touches,
			was = e.changedTouches,
			two = touch && now.length + (e.type === ptr.end ? was.length : 0) === 2

		var stage =
			e.type === ptr.start ? two ? 'capture' : 'grip' :
			e.type === ptr.move  ? two ? 'stretch' : 'pull' :
			e.type === ptr.end   ? two ? 'release' : 'free' :
			null

		var point1 = touch ? now[0] || {} : e,
			point2 = two
				? e.type === ptr.end ? was[0] : now[1]
				: { pageX: true }

		frames.view[stage](point1.pageX, point1.pageY, point2.pageX, point2.pageY)

		e.preventDefault()
	}
	function moveMap(e) {
		var point = touch ? e.touches[0] : e,
			scale = view.small() ? 0.5 : 1,
			box   = nav.getBoundingClientRect(),
			x     = point.pageX - box.left,
			y     = point.pageY - box.top

		frames.map.move(x / scale, y / scale)
	}
	function dragMap(e) {
		var point = touch ? e.touches[0] || e.changedTouches[0] : e,
			scale = view.small() ? 0.5 : 1,
			x     = point.pageX,
			y     = point.pageY

		var stage =
			e.type === ptr.start ? 'grip' :
			e.type === ptr.move  ? 'pull' :
			e.type === ptr.end   ? 'free' :
			null

		frames.map[stage](x / scale, y / scale, false)

		e.preventDefault()
	}
	function click(e) {
		if(view.user() && !C.VIEWONLY) {
			var point  = e.detail.changedTouches ? e.detail.changedTouches[0] : e.detail,
				x      = (point.pageX + frames.view.center.x),
				y      = (point.pageY + frames.view.center.y),
				seat   = Seat.findByPosition(x / frames.view.scale, y / frames.view.scale),
				parent = view.user().parent && seat ? FilterSeat.seatChild(seat, view.user().parent) : true;

			if(seat && parent){
				updateDisable(seat, view.user())
				
				if(view.user().parent) {
					var seat_parent = view.user().parent.seat;
				}
				seat && seat.take(view.user(), [x,y])
			}
		}
	}
}

function position(elem, x, y, s) {
	if(arguments.length <3) { y = x.y; x = x.x }
	var transform = 'translate('+ [x.px, y.px] +')'
	if(arguments.length >3) transform += ' scale('+ s +')'
	elem.style.      transform =
	elem.style.     OTransform =
	elem.style.    msTransform =
	elem.style.   mozTransform =
	elem.style.webkitTransform = transform
}
function click_sound() {
	if(el.sound.error && el.sound.error.code > 0) return
	// Sometimes setting time to 0 doesn't play back
	try { el.sound.currentTime = 0.01 }
	catch(e) { 'hello, my name is iOS' }
	el.sound.play()
}


function Tile(elem) {

}
Tile.prototype = {
	set: function(elem) {
		this.c = elem
		this.w = elem.width
		this.h = elem.height

		// this.c.style.display = 'none'

		return this
	},
	pos: function(x, y) {
		this.x = x
		this.y = y
		this.c.style.left = x.px
		this.c.style.top  = y.px

		return this
	},
	put: function(deck) {
		this.d = deck

		// this.p = decks[deck].elem
		// this.p.appendChild(this.c)

		return this
	}
}
function Map(gray, color) {
	this.gray  = gray.image || model.makeSpritePart(gray.sprite)
	this.color = color.image || model.makeSpritePart(color.sprite)
	this.frame = el.frame

	el.nav.appendChild(this.gray)
	el.frame.appendChild(this.color)
}
function Mask(item, index) {
	this.set(model.makeSpritePart(item.sprite))
		.pos(item.x, item.y)
		.put((item.deck || 1) - 1)

	this.c.className    = 'mask'
	this.c.style.zIndex = index + 101
}
Mask.prototype = new Tile

function Deck(item, index, elem) {
	this.elem = document.createElement('div')
	this.elem.className = 'deck'

	this.huge = item.huge
	if(this.huge) {
		this.back = model.makeImageCanvas(item.thumb.image)
		this.back.className = 'background'
		this.elem.appendChild(this.back)

		this.tiles = item.parts.map(function(e, i) {
			var x = i % item.tiles[0],
				y = i / item.tiles[0] |0,
				cvs, tile
                
			cvs = document.createElement('canvas')
			cvs.width  = item.width
			cvs.height = item.height

			tile = new Tile()
				.set(cvs)
				.pos(x * cvs.width, y * cvs.height)
				.put(index)

			tile.delayed = true
			tile.url     = e._url
			return tile

		}, this)
	} else {
		var tile = new Tile()
			.set(model.makeImageCanvas(item.image))
			.pos(item.translate[0], item.translate[1])
			.put(index)

		this.tiles = [ tile ]
	}

	el.plane.appendChild(this.elem)
}
function SeatGroup(items, index) {
	items.sort(numeric('y')).some(function(seat) { seat.group = this }, this)

	this.items   = items
	this.canvas  = document.createElement('canvas')
	this.context = this.canvas.getContext('2d')
	this.size    = this.getDimensions()
	this.deck    = decks[items[0].deck - 1].elem

	this.canvas.className     = 'seat'
	this.canvas.style.zIndex  = index + 1
	this.canvas.style.left    = this.size.left.px
	this.canvas.style.top     = this.size.top.px
	this.canvas.width         = this.size.width
	this.canvas.height        = this.size.height
	this.canvas.group         = this

	this.context.textAlign    = 'center'
	this.context.textBaseline = 'middle'
	this.context.fillStyle    = 'rgba(255, 255, 255, 0.7)'
	this.context.strokeStyle  = 'white'
	this.context.lineWidth    = 0.5

	this.set(this.canvas)
		.pos(this.size.left, this.size.top)
		.put(items[0].deck - 1)
}

SeatGroup.prototype = new Tile
SeatGroup.prototype.draw = function() {
	var size = this.size,
		ctx  = this.context

	ctx.clearRect(0, 0, size.width, size.height)

	if(debug.enabled) {
		var color = [rand(255), rand(255), rand(255), 0.3]
		ctx.save()
		ctx.fillStyle = 'rgba('+ color +')'
		ctx.fillRect(0, 0, size.width, size.height)
		ctx.restore()
	}

	this.items.some(method('draw'))
}
SeatGroup.prototype.getDimensions = function() {
	var xx = this.items.map(property('x')),
		yy = this.items.map(property('y')),
		x  = min(xx),
		y  = min(yy),
		X  = max(xx),
		Y  = max(yy),
		dx = min(this.items.map(offset_left  )),
		dy = max(this.items.map(offset_bottom))


	function offset_left  (s) { return s.x - x - s.size[0]*1.5 }
	function offset_bottom(s) { return s.y - Y + s.size[1]*1.5 }

	return {
		left  : x + dx,
		top   : y,
		width : X - x - dx,
		height: Y - y + dy
	}
}
function Seat(data) {
	this.copy(data)
	this.size = [
		Math.max(this.sprite.offset.size[0], this.sprite.w),
		Math.max(this.sprite.offset.size[1], this.sprite.h)
	]
    
    if (this.sprite.offset.polygon) {
        this.polygon = new Polygon(this.sprite.offset.polygon)
    }
    
	this.deckElement = decks[this.deck -1].elem
}
Seat.findByPosition = function(x, y) {
	var remains = seats.length, seat,
		user = view.user();

	while(seat = seats[--remains]) {
		if(((seat.match_service_class && seat.match_sex) || C.DEMO) &&
			(!seat.user || seat === user.seat) &&
			(view.upper() ? !seat.low && seat.deck == 2 : seat.deck < 2) &&
			// (!user.infant || (user.infant && user.parent.seat.id == seat.id)) && 
			seat.contains(x, y)){
			return seat
		}
	}
}
Seat.togglePassengers = function(show) {
	view.passengers_visible(show)
	seats.some(function(seat) {
		if(seat !== view.user().seat) seat.user = show && seat.back
	})
	groups.some(method('draw'))
}
Seat.unlink = function(user) {
	if(user && user.seat) {
		user.selection.parentNode && user.selection.parentNode.removeChild(user.selection)
		user.selection.className = "selection"

		user.seat.info = null
		user.seat.user = null
		user.seat.group.draw()

		user.seat = null
		
		user.curseat('')
		user.id_car('')
		if(user.child) {
			user.child().forEach(function(child){
				child.block(true)
			})
			view.usersbox_scroll.refresh(); 
		}

		updateDisable()
	}
}
Seat.link = function(user, seat) {
	if(user && seat) {
		position(user.selection, seat)
		user.label.textContent = seat.name
		seat.deckElement.appendChild(user.selection)
        add_class(user.selection, seat.type)

		user.seat = seat
		seat.info = user
		user.id_car(seat.id.split('-')[0])
		user.curseat(seat.num)
		seat.user = user.face[seat.sid]
		seat.group.draw()
		if(user.child) {
			user.child().forEach(function(child){
				child.block(false)
			})
			view.usersbox_scroll.refresh();
		}
		updateDisable()
	}
}
function numInfant(){
	var num = 0;
	view.users().forEach(function(user){
		if(user.infant){ 
			if(!user.seat){
				num += 1
			}
		}
	})
	return num
}
function updateDisable(seat, user){
	var num = numInfant();
	if((view.placedUsers().length + num) < (view.users().length)){
		view.error_len(true)
	} else {
		view.error_len(false)
	}

	var check = FilterSeat.checkSeat(seat, user);
	var val = check.res == false?  true : false;
	view.num_odd(check.odd);
	view.num_even(check.even);
	view.error_seat(val)
	view.disable_submite(view.error_seat() || view.error_len())
}

Seat.prototype = {
	constructor: Seat,

	labelSize:  Const.labelSize,
	labelTransform: Const.labelTransform,

	contains: function(x, y) {
        
        if (this.polygon) {
            return this.polygon.contains(x - this.x, y - this.y)
        }
        
		return this.sprite.offset.areas.some(function(border) {

			var dx = x - this.x - border[0],
				dy = y - this.y - border[1]
			return dx > 0 && dx < border[2]
				&& dy > 0 && dy < border[3]
		}, this)
	},
	updateState: function() {

		this.X = this.x - this.group.size.left - this.size[0]
		this.Y = this.y - this.group.size.top
        this.match_service_class = false
        this.match_sex = false
        var user = view.user()

        if (user) {
            this.match_service_class = (user.sc === "*" || this.sc === "*") || this.sc === user.sc
            this.match_sex = this.sex && this.sex === user.sex || !this.sex;
            // if (user.child) {
            //     this.match_service_class = this.match_service_class && this.has_child_cradle
            //     this.match_sex = this.match_sex && this.has_child_cradle
            // }
        }
	},
	draw: function() {
		this.updateState()
		var user = view.user();

		this.drawUnit(this.sprite, this.X, this.Y)
		if(debug.enabled) {
			this.drawArea([-1, -1, 2, 2])
			if (this.sprite.offset.areas) {
                this.sprite.offset.areas.some(this.drawArea, this)
            }
            if (this.sprite.offset.polygon) {
                this.drawPath(this.sprite.offset.polygon)
            }
		}

		if(this.user) {
			this.drawUnit(this.user,
					this.X + this.sprite.offset.user[0] + this.size[0] - this.user.w,
					this.Y + this.sprite.offset.user[1])
		} else if((this.match_service_class && this.match_sex) || C.DEMO) {
			if(view.user().parent && view.user().parent.seat){
				var res = FilterSeat.seatChild(this, view.user().parent)
				if(res) {
					this.drawLabel(this.name.toUpperCase())
				}
			} else {
				this.drawLabel(this.name.toUpperCase())	
			}
		}
	},
	drawUnit: function(img, x, y) {
        var ctx = this.group.context
        ctx.save()
        
        if (this.has_child_cradle) {
            var selected_user = view.user()
            if (selected_user && selected_user.child && this.user && this.num.toUpperCase() != selected_user.curseat()) {
                ctx.shadowColor = "#00FF00";
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
        }

		ctx.drawImage(model.struct.sprite.image,
			img.x, img.y, img.w, img.h,
			    x,     y, img.w, img.h)
                
        ctx.restore()
	},
    drawPath: function(path) {
        var left = this.x - this.group.size.left
        var top = this.y - this.group.size.top
        var ctx  = this.group.context
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(path[0]+left, path[1]+top)
        
        for (var i=2, l=path.length; i<l; i+= 2) {
            ctx.lineTo(path[i]+left, path[i+1]+top)
        }
        
        ctx.closePath()
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'blue';
        ctx.stroke();
        ctx.restore()
    },
	drawArea: function(area) {
		this.group.context.strokeRect(
			area[0] + this.x - this.group.size.left,
			area[1] + this.y - this.group.size.top,
			area[2],
			area[3])
	},
	drawLabel: function(text) {
		var ctx  = this.group.context
        var size = this.labelSize
        var dx = this.sprite.offset.label[0] + this.sprite.offset.size[0]
        var dy = this.sprite.offset.label[1]

		ctx.save()
		ctx.fillStyle =
			debug.enabled && this.over ? 'orangered' :
			debug.enabled && this.low  ? 'crimson'   :
			this === model.taken       ? '#19cf00'   :
			                             'rgba(0,0,0,0.5)'

		ctx.translate(this.X + dx, this.Y + dy)
		ctx.transform.apply(ctx, this.labelTransform)
		ctx.fillRect(0, 0, size, size)
		ctx.strokeText(text, size / 2, size / 2)
		if(this.type.indexOf('right') !== -1) {
			ctx.textAlign = 'right';
			ctx.strokeText(this.sc_name, (size/2) - size*0.75 , size / 2)
		} else {
			ctx.textAlign = 'left';
			ctx.strokeText(this.sc_name, (size/2) + size*0.75 , size / 2)
		}
		
		ctx.textAlign = 'center';
		ctx.restore()
		
	},
	drawCheck: function(str) {
		var ctx  = this.group.context
        var size = this.labelSize
        var dx = this.sprite.offset.label[0] + this.sprite.offset.size[0]
        var dy = this.sprite.offset.label[1]
           
		ctx.save()
		ctx.fillStyle =
		this.marker_check && this.marker_check.check ? 'rgba(255,255,0,0.5)':
			                             'rgba(255,255,255,0.5)'

		if(!this.marker_check) {
			this.marker_check = {
	        	x: this.X + dx + size,
	        	y: this.Y + dy,
	        	check: false
	        };	
		} else {
        	this.marker_check.x = this.X + dx + size
        	this.marker_check.y = this.Y + dy
		}

		ctx.translate(this.marker_check.x,this.marker_check.y)
		ctx.transform.apply(ctx, this.labelTransform)
		ctx.fillRect(0, 0, size, size)
		if(this.marker_check.check == true){
			ctx.strokeText('T', size / 2, size / 2)
        } else {
        	ctx.strokeText('F', size / 2, size / 2)	
        }
		ctx.restore()
	},
	highlight: function(coor) {
		rem_class(el.fly, 'animate')
		position(el.fly, coor ? coor[0] : this.x + this.sprite.offset.center[0],
						 coor ? coor[1] : this.y + this.sprite.offset.center[1])

		clearTimeout(Seat.highlightTimer)
		var finish = rem_class(el.fly, 'void');

		setTimeout(function(){add_class(el.fly, 'animate')}, 10 )
		Seat.highlightTimer =  setTimeout(function() {
			Seat.highlightTimer = undefined	
			rem_class(el.fly, 'animate')
			add_class(el.fly, 'void')
		}, 500)
	},
	take: function(user, coor) {
		if(debug.enabled) console.log(this)

		var already_placed = user.seat === this;

		Seat.unlink(user);
		if(user.child) {
			user.child().forEach(function(child){
				Seat.unlink(child);
			})
		}

		if(!already_placed) {
			Seat.link(user, this);
			C.DEMO || select_next_user() // переключение на следующего user
		}

		this.highlight(coor)
		click_sound()
	},
	hover: function(value) {
		this.over = !!value
		this.group.draw()
	}
};
