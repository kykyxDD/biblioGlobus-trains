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
	item_seat: false,
	showPopupHelp : false,
	upper  : false,
	user   : null,
	click_select: null,
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
	view      : '.view',
	plane     : '.plane',
	nav       : '.nav',
	logo      : '.airline-logo',
	nav_logo  : '.airline-logo-small',
	frame     : '.frame',
	fly       : '.fly',
	result    : '.popup.done',
	error     : '.popup.fail',
	progress  : '.background .caption',
	current   : '.selection',
	label     : '.selection .label',
	hind      : '.popup_seat',
	popup_sex : '.popup_selected_sex'
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
	view.groups_seat = ko.observable();

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
		el.progress.textContent = typeof error == 'string' ? error : error.message;
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
	setup_navigation()
	update_users(model.users)
	model.struct.double_decker && view.hide_upper_deck()
	create_group_seat()
	// update_group_seat()
	loadImageIcon()

	resize()
	register_events()

	frames.view.zoom(view.small() ? 0.5 : 1)

	view.users().forEach(function(user) {
		Seat.link(user, seats.select('num', user.curseat()))
	})
	// groups.some(method('draw'))
	// load_session()

	view.loading('done')
	setTimeout(view.loading, 500, 'void')

    if ('MESSAGE' in model.ticket) {
        view.error(model.ticket.MESSAGE)
    }
}

function loadImageIcon(){
	var loader = new Loader;
	
	var obj_url = {
		'no_seat': {
			src: BASE_URL + 'img/04_no.png',
			seats: [],
			img: false
		},
		'no_seat_r': {
			src: BASE_URL + 'img/02_no.png',
			seats: [],
			img: false
		},
		'seat_l_na': {
			src: BASE_URL + 'img/02.png',
			seats: [],
			img: false	
		},
		'seat_l_a': {
			src: BASE_URL + 'img/02.png',
			seats: [],
			img: false	
		},
		'seat_r_na': {
			src: BASE_URL + 'img/04.png',
			seats: [],
			img: false	
		},
		'seat_r_a': {
			src: BASE_URL + 'img/06.png',
			seats: [],
			img: false	
		},
		'icon_f' : {
			src: BASE_URL + 'img/sex_f.png',
			seats: [],
			img: false
		},
		'icon_m' : {
			src: BASE_URL + 'img/sex_m.png',
			seats: [],
			img: false	
		},
		'icon_s' : {
			src: BASE_URL + 'img/sex_s.png',
			seats: [],
			img: false
		},
		'icon_c' : {
			src: BASE_URL + 'img/sex_c.png',
			seats: [],
			img: false	
		}
	}
	view.objIconSeat = obj_url;
	var num = 0;
	for(var key in obj_url){
		num++
		(function(obj){
			loader.image(obj.src, function(img) {
				obj.img = img;
				num--
				if(!num) {
					groups.some(method('draw'))
				}
			})
		})(obj_url[key])
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
	view.current_car_descr_short = ko.observable('')
	view.current_car_carrier = ko.observable('')
	view.current_car_prime_from = ko.observable('')
	view.current_car_prime_to = ko.observable('')
	view.current_car_modifier = ko.observable('') 
	view.current_car_spec_conds = ko.observable('')
	var obj = {
		len: ko.observable(false),
		ELREG: ko.observable(false),
		EAT: ko.observable(false),
		COND: ko.observable(false),
		BED: ko.observable(false),
		SAN: ko.observable(false)
	};
	view.current_car_info = ko.observable(obj);

	view.next_car_item = ko.observable(false)
	view.next_car_type = ko.observable('')
	view.next_car_num = ko.observable('')
	view.regul_seat = ko.observable('');
	view.scroll_regul_seat = ko.observable(false);
	view.hind = ko.observable('');
	view.text_hind = ko.observable(false);
	view.error_seat = ko.observable(false);
	view.popup_user = ko.observable('');
	view.popup_user_name = ko.observable('');
	view.popup_user_num = ko.observable('');
	view.popup_user_sc = ko.observable('');
	view.show_popup_select_sex = ko.observable(false);

	navigation.position = V(0.2, 0.2)
	var update_nav_interval = setInterval(update_view, 200)
	view.scroll_prev_to_car = function() {
	    
	    var cars = model.ticket.TRAIN.CAR
	    var ind = calc_current_car_index() - 1
	    if (ind < 0) ind = 0
	    if(ind === calc_current_car_index()) return

	    var pos = (ind + 0.5) / cars.length

	    navigation.stop_glide()
	    navigation.move(V(pos, pos))
	    
	    update_view()
	}

	view.scroll_next_to_car = function() {
	    
	    var cars = model.ticket.TRAIN.CAR
	    var ind = calc_current_car_index() + 1
	    if (ind >= cars.length) ind = cars.length - 1
	    if(ind === calc_current_car_index()) return

	    var pos = (ind + 0.5) / cars.length

	    navigation.stop_glide()
	    navigation.move(V(pos, pos))
	    
	    update_view()
	}

}

function calc_current_car_index()
{
    var cars = model.ticket.TRAIN.CAR
    var pos = navigation.position.x
    
    var ind = Math.floor(pos * cars.length)
    
    return ind
}

function update_view()
{
    var index = calc_current_car_index()
    var ind = index
    
    var cars = model.ticket.TRAIN.CAR
    var car = cars[ind]
    if(!cars || !car) return
    var car_info = model.planes.bus_parts[car.type]

    view.current_car_type(car_info.desc)
    view.current_car_num("Вагон №" + car.num)
    view.current_car_descr_short(car.DESCR.SHORT)
    view.current_car_descr(car.DESCR.text)
    view.current_car_carrier(car.CARRIER)
    view.current_car_prime_from(car.PRICE.from)
    view.current_car_modifier((car.CAT_MODIFIER && car.CAT_MODIFIER.text) || '')
    view.current_car_spec_conds(car.SPEC_CONDS)
    if(car.PRICE.to !== '') {
    	view.current_car_prime_to(car.PRICE.to)
    } else {
    	view.current_car_prime_to(false)
    }

    var info = view.current_car_info();
    var arr_info = car.SRV && car.SRV.short ? car.SRV.short.split(',') : [];

    if(car.elreg) {
    	arr_info.push('ELREG')
    }
    info['len'](!arr_info.length ? false : true)

    for(var key in info){
    	if(key == 'len') continue
    	var index = arr_info.indexOf(key)
    	if(index >= 0){
    		info[key](true)
    	} else {
    		info[key](false)
    	}
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
function _date (str){
	var arr_month = ['января' , 'февраля' , 'марта' , 'апреля' , 'мая' , 'июня' , 'июля' , 'августа' , 'сентября' , 'октября' , 'ноября' , 'декабря '];
	var arr_day = ['понедельник' , 'вторник' , 'среда' , 'четверг' , 'пятница' , 'суббота' , 'воскресение']
	var arr = str.split('.').reverse();
	var date = new Date(arr)
	return {
		date: date.getDate(),
		month: arr_month[date.getMonth()], 
		day: arr_day[date.getDay()],
		year: date.getFullYear()
	}
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
	view.idt_href = ko.observable(false)
	view.idt_href(view.board.idt)
	view.board.time = /(\d+?)(\d\d)$/.exec(view.board.takeoff_time).slice(1).join(':')
	view.board.arrival_time = /(\d+?)(\d\d)$/.exec(view.board.arrival_time).slice(1).join(':')
	view.formatAirport = function(data) {
		return data.port_rus + " " + data.port
	}

	_date(view.board.date)
	view.board.date = _date(view.board.date)
	view.board.arrival_date = _date(view.board.arrival_date)
	view.objIconSeat = {}
	view.item_group = ko.observable(false)
	view.users = ko.observableArray()
	view.group_seat = ko.observable()

	view.placedUsers = ko.computed(function() {
		return view.users().filter(function(user){
			return user.curseat() && !user.disabled
		})
	}, view)
	view.selectUser = function(user, e) {
		// console.log(user, e)
		if(user && (!user.parent || (user.parent && user.parent.seat)) && !user.disabled && !user.block()) {
			var previous = view.user()

			if(previous) {
				rem_class(previous.selection, 'active')
				previous.selected(false)
				if(previous.child) {
					previous.child().forEach(function(child){
						child.p_selected(false)
					})
				}
				if(previous.parent) {
					previous.parent.p_selected(false)
					previous.parent.child().forEach(function(child){
						child.p_selected(false)
					})
				}
			}
			view.user(user)
			user.selected(true)
			if(user.child) {
				user.child().forEach(function(child){
					child.p_selected(true)
				})
			} 
			if(user.parent) {
				user.parent.p_selected(true)
				user.parent.child().forEach(function(child){
					child.p_selected(true)
				})
			}
			add_class(user.selection, 'active')
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
		if(user && user.disabled && user.seat){
			frames.view.move(user.seat.x, user.seat.y, true)
		}
	}

	view.changeSelectParent = function(data, event){
		var user = view.click_select();

		var select = event.currentTarget || event.srcElement;
		var val = view.list_parent()[select.selectedIndex];

		if(val.child && val.child.indexOf(user) >= 0) return

		if(user.parent && user.parent.child) {
			user.parent.child.remove(user);	
		}
		user.sc = val.sc;
		user.parent = val;
		user.parent_name(val.name);
		user.fclass_name(val.fclass_name());
		user.index = user.parent.index + user.parent.child().length + 1;
		val.child.push(user);
		sortUsers();
		if(!val.seat) {
			user.block(true);
			Seat.unlink(user);
			C.DEMO || select_next_user();
			view.usersbox_scroll.refresh();
		} else {
			user.block(false);
			if(user.seat && user.seat.id.split('-')[0] !== val.seat.id.split('-')[0]) {
				Seat.unlink(user);
			}
		}
		updateDisable()
	}
	view.clickSelectParent = function(data){
		if(!view.user() || data.id !== view.user().id) {
			view.selectUser(data)
		}
		view.click_select(data)
	}
	view.changeSex = function(item, event){
		
		var group = view.item_group();
		var seat = view.item_seat();
		var user = view.user();
		var target = event.target || event.srcElement;
		var sex = target.value;

		if(group) {
			var next_sex = sex == 's' || sex == 'c';
			if(!next_sex) {
				group.seats.forEach(function(s_itm){
					if(s_itm.user && !s_itm.info.infant && s_itm.info.sex !== sex){
						Seat.unlink(s_itm.info)
					}
				})
			}

			if(((user.parent && user.parent.curseat() && FilterSeat.seatChild(seat, user.parent)) || !user.parent)) {
				if((sex == view.user().sex || sex == 's') && seat.match_service_class && seat.match_sex){
					Seat.link(user, seat)
					C.DEMO || select_next_user()
				}
			}
			group.sex = sex;
			group.seats.forEach(function(g_seat){
				g_seat.sex = sex;
				g_seat.group.draw()
			})
			if(user.parent && !user.parent.seat && !user.seat) {
				select_next_user()
			}
		}
		
		hidePopupSex()
	}
	view.showPopupHelp = function(){
		if(view.show_popup_help()) {
			view.show_popup_help(false)
		} else {
			view.show_popup_help(true)
		}
	}
	view.regul_seat(model.locale.message)
	view.airline = ko.observable(model.airline)
	view.classes = ko.observableArray([view.orient, view.decker, view.airline])
	if(debug.enabled) view.classes.push(function() { return 'debug'})
	if(C.DEMO || C.VIEWONLY) view.classes.push(function() { return 'demo' })
    if (C.VIEWONLY) view.classes.push(function() { return 'viewonly' })

	view.root_class = ko.computed(function() {
		return this.classes().map(method('call')).join(' ')
	}, view)

	view.scroll_regul_seat = new iScroll('regul_seat')

	view.list_parent 	= ko.observableArray()
	view.display_result = ko.observable(false)
	view.result_header  = ko.observable('')
	view.result_text    = ko.observable('')
	view.display_error  = ko.observable(false)
	view.opacity_error  = ko.observable(true)
	view.error_message  = ko.observable('')
	view.error_len 		= ko.observable(true);
	view.disable_submite = ko.observable(true);
	view.show_regul_seat = ko.observable(false);
	view.show_disable_seat = ko.observable(false);
	view.show_popup_help = ko.observable(false)
	view.popup_right     = ko.observable(false)
	view.sex_text 		= {
		'f' : ['Ж', '  только женского пола'], 
		'm' : ['М', "  только мужского пола"], 
		'c' : ['Ц', ' по выбору пола пользователем'],
		's' : ['C', ' ']
	};
	view.error_texts = {
		sc: "Не совпадает класс обслуживания пассажира и места.", 
		sex: "Не совпадает пол.",
		parent: 'Ребенок должен сидеть в одном вагоне с родителем.',
		no_seat: 'Нет доступа к посадке на это место.'
	}
	view.confirm_caption = ko.computed(function() {
		return view.small() ? 'Готово' : 'Зарегистрировать'
	})

	view.submit = function() {
		if(!view.disable_submite()) {
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
		view.idt_href(view.board.idt)
		// groups.some(method('draw'))
		view.display_result(true)
		view.result_header(text.head)
		view.result_text(text.body)
		view.register_scroll.destroy()
		view.register_scroll = new iScroll('confirm-users')
	}
	view.error = function(message) {
		view.display_error(true)
		view.opacity_error(false)
		view.error_message(message)
	}
	view.hide_error = function() {
		view.display_error(false)
		view.opacity_error(true)
		view.loading('done')
		setTimeout(view.loading, 500, 'void')
	}
	view.complete = function() {
		view.display_result(false)
		view.loading('done')
		view.selectUser(view.users()[0])
		setTimeout(view.loading, 500, 'void')
	}
	view.funRegusSeat = function(){
		if(view.show_regul_seat()) {
			view.show_regul_seat(false)	
		} else {
			view.show_regul_seat(true)
		}
		view.scroll_regul_seat.refresh()
	}

	ko.applyBindings(view)
	view.register_scroll = new iScroll('confirm-users')
	view.usersbox_scroll = new iScroll('users-scroll')


	setTimeout(function() { view.usersbox_scroll.refresh() })
}
function make_selection_label(user) {
	var root = document.createElement('div');
	root.className = 'selection ' +user.sex;
	// root.setAttribute('data-bind','css: { "active": userselected}')
	root.innerHTML =
		'<div class="wrap">'+
			'<img height="100%" src="'+ BASE_URL + 'img/06.png">'+
			'<div class="label"></div>'+

 		'</div>'
 	root.user = user
	return { 
		selection: root, 
		label: root.querySelector('.label')
	}
}
function select_next_user() {
	var users = view.users(),
		index = users.indexOf(view.user()),

		await = users.slice(index).concat(users.slice(0, index)).filter(function(item){
			return !item.curseat() && !item.block() && !item.disabled
		})

	if(await.length){ 
		view.selectUser(await[0]) 
	}
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
function create_group_seat(){
	var groups_seat = {};

	seats.forEach(function(seat){
		var arr = seat.num.split('-');
		var num = arr[0];
		var id = +arr[1];
		var id_group = Math.floor((id-1)/4);
		var obj_g = groups_seat[num], obj;
		var sex = seat.sex == 'c' && id < 37 ? true : false;

		if(!obj_g){
			groups_seat[num] = {};
			obj_g = groups_seat[num]
			obj_g.groups = [];
			obj = {
				sex: sex,
				seats: [seat]
			}
			obj_g.groups[id_group] = obj;
			seat.group_seat = obj
		} else {
			obj = obj_g.groups[id_group]
			if(obj) {
				obj_g.groups[id_group].seats.push(seat)
			} else {
				obj = {
					sex: sex,
					seats: [seat]
				}
				obj_g.groups[id_group] = obj
				seat.group_seat = obj;
			}
		}
		if(sex) {
			create_label(seat)
		}

		seat.group_seat = obj
	})

	view.groups_seat(groups_seat)
}
function create_label(seat) {
	var div = document.createElement('div');
	div.className = 'label_group';
	seat.deckElement.appendChild(div);
	var dx = seat.X + seat.sprite.offset.label[0] + seat.sprite.offset.size[0];
    var dy = seat.Y + seat.sprite.offset.label[1] -7;

	div.addEventListener('click', function(){
		showPopupSex(seat)
	})
	seat.labels = div
}
function update_group_seat() {
	var train = view.groups_seat();

	for(var s in train) {
		var g = train[s].groups;
		for(var i = 0; i < g.length; i++){
			if(!g[i]) continue
			if(g[i].sex) {
				var seats = g[i].seats;
				var min_x = 10000000,
					min_y = 10000000,
					max_x = 0,
					max_y = 0
				for(var g_s = 0; g_s < seats.length; g_s++) {
					var seat = seats[g_s]
					var pos = [seat.x, seat.y];
					min_x = Math.min(min_x, pos[0])
					max_x = Math.max(max_x, pos[0])
					min_y = Math.min(min_y, pos[1])
					max_y = Math.max(max_y, pos[1])
				}
				g[i].center = {
					x: min_x + (max_x - min_x)/2,
					y: min_y + (max_y - min_y)/2
				}
			}
		}
	}
}
function changeSexGroup(group){
	if(!view.show_popup_select_sex() || 
	   (view.item_group() && (view.item_group().center.x !== group.center.x || view.item_group().center.y !== group.center.y))){
		view.item_seat(false);
		showPopupSex(group)
	} else {
		hidePopupSex();
	}
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
	users.forEach(function(user) {
		if(!user.parent) {
			user.index = (view.list_parent().length + 1)*100;
			view.list_parent().push(user)
		}
	})

	users.forEach(function(user, index) {
		var seat = seats.select('num', user.curseat)
		user.d_check  = ko.observable(user.d_check  || false)
		user.id_group = ko.observable(user.id_group || false)
		user.parent_name = ko.observable(user.parent ? user.parent.name : '')
		user.seat     = seat
		user.selected = ko.observable(false)
		user.block    = ko.observable(!user.parent || (user.parent && user.parent.disabled && user.parent.seat)? false : true)
		user.error    = ko.observable(user.error   || '')
		user.curseat  = ko.observable(user.curseat || '')
		user.id_car   = ko.observable(user.id_car  || '-')
		user.fclass_name  = ko.observable(user.fclass  || '')
		user.p_selected = ko.observable(false)
		user.index    = user.index ? user.index : user.parent.index + user.parent.child.indexOf(user) + 1; 

        user.seat_name = ko.computed(function() {
            return user.curseat().replace(/^.*-/, '')
        })
        if(seat) seat.user = user.face[seat.sid]

		user.copy(make_selection_label(user))
	})

	var select_user = users.filter(function(itm){
		return !itm.disabled
	})

	view.users(users)
	sortUsers()
	select_next_user()
	view.group_ticket(model.group_ticket)
}
function sortUsers(){
	var users = view.users() 
	view.users(users.sort(function(a,b){
		return a.index > b.index ? 1 : -1;
	}))
}
function showPopupSex(seat){
	if(!view.user()) return
	var group = seat.group_seat;
	view.item_group(group)
	view.item_seat(seat)
	var right = seat.seat_right ? seat.labelSize*2 : seat.labelSize;

	position(el.popup_sex, seat.labels_pos.x - right, seat.labels_pos.y)
	view.popup_right(seat.seat_right)

	view.show_popup_select_sex(true);
	if(group.sex !== true){
		el.popup_sex.querySelector('input[value="'+group.sex+'"]').checked = true
	} else {
		var all_input = el.popup_sex.querySelectorAll('input[name="sex"]')
		for(var i = 0; i < all_input.length; i++){
			if(all_input[i].checked) all_input[i].checked = false
		}
	}
	
} 
function hidePopupSex(e){
	view.item_group(false)
	view.show_popup_select_sex(false);
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
                            o.c.getContext('2d').font = "12px Verdana";
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

	view.small(window.innerWidth < 640)
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
	frames.view.zoom(frames.view.scaleMin)
}

function register_events() {
	var isSafari = (navigator.userAgent.search("Safari") >= 0 && navigator.userAgent.search("Chrome") < 0)
	var touch = (navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0 || isSafari) && 'ontouchstart' in window ;

	var ptr = {
		start : touch ? 'touchstart' : 'mousedown',
		move  : touch ? 'touchmove'  : 'mousemove',
		end   : touch ? 'touchend'   : 'mouseup',
		out   : 'mouseout',
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
		[ plane   , ptr.out    , hideHind ],
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

		if(!touch && e.type.indexOf('move') >= 0) { 
			dragMove(e, point1)
		} else {
			view.popup_user(false)
			view.hind(false)
		}

		e.preventDefault()
	}
	function dragMove(e, point1){

		var x    = (point1.pageX + frames.view.center.x),
			y    = (point1.pageY + frames.view.center.y),
			seat = Seat.findByPositionMove(x / frames.view.scale, y / frames.view.scale)

		var target = e.target || e.srcElement;
		var user
		view.popup_user(false)
		view.error_seat(false)
		view.text_hind(false)

		var user = view.user();

		if(seat){
			view.hind(true)
			position(el.hind, seat.popup_pos.x, seat.popup_pos.y)
			view.popup_user_num(seat.name)
			view.popup_user_sc(seat.sc_name)

			if(seat.user) {
				var elem_parent = target.parentNode;
				var info_user = seat.info;
				view.popup_user(true)
				view.popup_user_name(info_user.name)

			} else if(user && user.parent && FilterSeat.seatChild(seat, user.parent) == false){
				view.error_seat(view.error_texts.parent)
			} else if(seat.sex){
				view.text_hind(view.sex_text[seat.sex][1])
			} else if(seat.match_service_class && seat.match_sex) {
				view.text_hind(view.sex_text['s'][1])
			} else if(!seat.match_service_class){
				view.error_seat(seat.sc ? view.error_texts.sc : view.error_texts.no_seat)
				view.text_hind('')
			}
		} else {
			view.hind(false)
		}
	}
	function hideHind(e) {
		view.hind(false)
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
		var target = e.target || e.srcElement;

		if(target.tagName == 'INPUT' || target.tagName == 'LABEL' || has_class(target,'change_sex') || has_class(target,'label_group')) return
		if(view.user() && !C.VIEWONLY) {
			var point  = e.detail.changedTouches ? e.detail.changedTouches[0] : e.detail,
				x      = (point.pageX + frames.view.center.x),
				y      = (point.pageY + frames.view.center.y),
				seat   = Seat.findByPosition(x / frames.view.scale, y / frames.view.scale),
				parent = view.user().parent && seat ? FilterSeat.seatChild(seat, view.user().parent) : true;
			if(seat) {
				view.item_seat(seat);

				if(seat.group_seat.sex == true){
					// showPopupSex(seat)
				} else if(seat && parent){
					updateDisable(seat, view.user())

					if(view.user().parent) {
						var seat_parent = view.user().parent.seat;
					}
					seat && seat.take(view.user(), [x,y])
				}
			} else if(view.show_popup_select_sex()){
				hidePopupSex()
			}
		}
	}
}
function numUserGroup(group){
	var num = 0
	group.seats.forEach(function(seat){
		if(seat.user) num++
	})
	return num
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
			seat.contains(x, y)){
			return seat
		}
	}
}
Seat.findByPositionMove = function(x, y) {
	var remains = seats.length, seat,
		user = view.user();

	while(seat = seats[--remains]) {
		if((view.upper() ? !seat.low && seat.deck == 2 : seat.deck < 2) &&
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
Seat.unlink = function(user, unlink_child) {
	if(user && user.seat) {
		user.selection.parentNode && user.selection.parentNode.removeChild(user.selection)
		user.selection.className = "selection "+user.sex

		var prev_seat = user.seat

		user.seat.info = null
		user.seat.user = null

		user.seat.group.draw()
		user.seat = null
		
		user.curseat('')
		user.id_car('-')

		if(user.child && !unlink_child ) {
			user.child().forEach(function(child){
				child.block(true)
				Seat.unlink(child);
			})
			view.usersbox_scroll.refresh(); 
		}

		updateDisable()
	}
}
Seat.link = function(user, seat) {
	if(user && seat && !seat.user) {

		if(user.seat) {
			Seat.unlink(user)
		}

		view.item_seat(false);
		position(user.selection, seat)
		user.label.textContent = seat.name;
		seat.deckElement.appendChild(user.selection)
		if(has_class(user.selection)) {
			add_class(user.selection, seat.type)
		} else  {
			add_class(user.selection, seat.type + ' active')
		}

		user.seat = seat
		seat.info = user
		user.id_car(seat.id.split('-')[0])
		user.curseat(seat.num)
		seat.user = user.face[seat.sid]

		if(user.child) {
			user.child().forEach(function(child){
				child.block(false)
			})
			view.usersbox_scroll.refresh();
		}

		seat.group.draw()
		updateDisable()
	}
}
function numInfant(){
	var num = 0;
	view.users().forEach(function(user){
		if(user.infant){ 
			if(!user.seat && !user.disabled){
				num += 1
			}
		}
	})
	return num
}
function numDisable(){
	var num = 0;
	view.users().forEach(function(user){
		if(!user.infant && user.disabled && user.seat){
			num += 1
		}
	})
	return num
}
function updateDisable(seat, user){
	var num_infant = numInfant();
	var num_disable = numDisable();
	if(!view.placedUsers().length || (view.placedUsers().length + num_infant) < (view.users().length - num_disable)){
		view.error_len(true)
	} else {
		view.error_len(false)
	}

	view.disable_submite(view.error_len())
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
            this.match_sex = (this.sex && (this.sex === user.sex || this.sex =='c' || this.sex == 's')) || !this.sex || user.infant;
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
				} else {
					this.drawLabelNoSeat(this.name.toUpperCase())
				}
			} else {
				this.drawLabel(this.name.toUpperCase())
			}
		} else {
			this.drawLabelNoSeat(this.name.toUpperCase())
		}

		
		if(!this.popup_pos || (this.group_seat.sex && !this.labels_pos)) {
			var size = this.labelSize;
	        var dx = this.sprite.offset.label[0] + this.sprite.offset.size[0];
	        var dy = this.sprite.offset.label[1];
	        var right = this.num_side !== 'right' ? true : false;
			var i_dx = right ? -size*0.9 : size*1.2 ;
			var i_dy = size/2
			var l_dx = this.X + dx + i_dx - (size*0.7) + this.group.size.left;
			var l_dy = this.Y + dy + i_dy -9 - size*1.5 + this.group.size.top;
			if(!this.popup_pos) {
				this.popup_pos = {
					x: right ? l_dx + size*1.5 - 200 : l_dx - size, 
					y: l_dy + size*1.5
				}
			}
			if(this.group_seat && this.group_seat.sex){
				if(!this.labels_pos) {
					this.labels_pos = {
						x: l_dx, 
						y: l_dy
					}
					this.show_labels = true
					this.seat_right = right;
					if(this.sex == 'c') {
						position(this.labels, this.labels_pos.x, this.labels_pos.y)	
					}

					
				}
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
		var ctx  = this.group.context;
        var size = this.labelSize;
        var dx = this.sprite.offset.label[0] + this.sprite.offset.size[0];
        var dy = this.sprite.offset.label[1];
        var obj_img = view.objIconSeat

		ctx.save();
		ctx.fillStyle =
			debug.enabled && this.over ? 'orangered' :
			debug.enabled && this.low  ? 'crimson'   :
			this === model.taken       ? '#19cf00'   :
			                             'rgb(0,0,0)';

		ctx.translate(this.X + dx, this.Y + dy - 7);
		ctx.transform.apply(ctx, this.labelTransform);

		var right = this.num_side !== 'right' ? true : false;
		var img_s = right ? obj_img['seat_l_na'] : obj_img['seat_r_na'];
		var img_sex = this.sex ? obj_img['icon_'+this.sex] : obj_img['icon_s'];

		if(!img_s || !img_sex) {
			ctx.restore()
			return
		}
		var w = right ? Math.floor(img_s.img.width/size) -1 : 0;

		if(img_s.img) {
			ctx.drawImage(img_s.img, 0-size*w, 0, img_s.img.width, img_s.img.height)	
		} else {
    		img_s.seats.push(this)
		}

		var i_dx = right ? 0-size + (size - img_sex.img.width)/2 : 0 +  size + (size - img_sex.img.width)/2;
		var i_dy = right ? 0 + (size - img_sex.img.height)/2     : 0 + (size - img_sex.img.height)/2;
		var l_dx = this.X + dx + i_dx - (size*0.7) + this.group.size.left;
		var l_dy = this.Y + dy + i_dy -7 - size*1.5 + this.group.size.top

		if(img_sex.img) {
			ctx.drawImage(img_sex.img, i_dx, i_dy, img_sex.img.width, img_sex.img.height)
		}

		this.coor_popup = right ? [this.x, this.y] : [this.x + size, this.y];
		ctx.strokeStyle = "rgb(0,0,0)";
		ctx.fillText(text, size / 2, size / 2);

		ctx.textAlign = 'center';
		ctx.restore();
	},
	drawLabelNoSeat: function(text){
		var ctx  = this.group.context;
        var size = this.labelSize;
        var dx = this.sprite.offset.label[0] + this.sprite.offset.size[0];
        var dy = this.sprite.offset.label[1];
        var obj_img = view.objIconSeat

        ctx.save();
		ctx.fillStyle =
			debug.enabled && this.over ? 'orangered' :
			debug.enabled && this.low  ? 'crimson'   :
			this === model.taken       ? '#19cf00'   :
			                             'rgba(255, 255, 255)';
		
		
		var right = this.num_side !== 'right' ? true : false;
		var obj = right ? obj_img['no_seat_r'] : obj_img['no_seat'];
		var img_sex = this.sex ? obj_img['icon_'+this.sex] : obj_img['icon_s'];

		if(!obj || !img_sex) {
			ctx.restore()
			return
		}
		if(obj.img) {
			ctx.translate(this.X + dx , this.Y + dy - size/4 -1);
			ctx.transform.apply(ctx, this.labelTransform);
			ctx.fillText(text, size / 2, size / 2);

			ctx.drawImage(obj.img, 0 - (right ? size : 0), 0, obj.img.width, obj.img.height)		
			
		}
		
		if(img_sex.img) {
			var i_dx = right ? 0-size + (size - img_sex.img.width)/2 : 0 +  size + (size - img_sex.img.width)/2;
			var i_dy = right ? 0 + (size - img_sex.img.height)/2     : 0 + (size - img_sex.img.height)/2;
			ctx.drawImage(img_sex.img, i_dx, i_dy, img_sex.img.width, img_sex.img.height)
			// this.drawLine(right)
		}
		ctx.restore();
	},
	drawLine: function(side){
		var ctx = this.group.context;
		var size = this.labelSize;

	    ctx.beginPath();

	    if(!side) {
	    	ctx.moveTo(size - size/8,0.5);
	    	ctx.lineTo(size*2 - size/8, 0.5)
	    	ctx.quadraticCurveTo(size*2, 0.5,size*2, size/8);
	    	ctx.lineTo(size*2, size - size/8)
	    	ctx.quadraticCurveTo(size*2, size, size*2 - size/8, size-1);
	    	ctx.lineTo(size-3, size-1)
	    } else {
	    	ctx.moveTo(0,0.5)
	    	ctx.lineTo(-size + size/8, 0.5)
	    	ctx.quadraticCurveTo(-size, 1,-size, size/8);
	    	ctx.lineTo(-size, size - size/8)
	    	ctx.quadraticCurveTo(-size, size-1, -size + size/8, size -1);
	    	ctx.lineTo(0, size-1)
	    }
	    ctx.lineWidth = 1
		ctx.stroke()
		    
	},
	
	drawMaskSeat: function(){
		var ctx  = this.group.context;
        var size = this.labelSize;
        var dx = this.sprite.offset.label[0] + this.sprite.offset.size[0];
        var dy = this.sprite.offset.label[1];

		ctx.save();
		ctx.fillStyle ='rgba(0,0,0,0.4)';
		var poly = this.polygon.vertices;

		ctx.translate(this.X - this.sprite.offset.label[0] + size, this.Y  + size);
		ctx.transform.apply(ctx, this.labelTransform);

		ctx.beginPath();
		for(var i = 0; i < poly.length; i++){
			if(i == 0) {
				ctx.moveTo(poly[i].x, poly[i].y)
			} else {
				ctx.lineTo(poly[i].x, poly[i].y)
			}
		}
		ctx.closePath();
		ctx.fill();
		ctx.restore();
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

		if(user.seat && user.seat.num){
			var index = user.seat.num.split('-');

			Seat.unlink(user, !already_placed);
			if(user.child && +index[0] != +this.num.split('-')[0]) {
				user.child().forEach(function(child){
					if(child.seat){
						Seat.unlink(child);	
					}
				})
				view.usersbox_scroll.refresh(); 
			}
		}

		if(!already_placed) {
			Seat.link(user, this);
			C.DEMO || select_next_user() // переключение на следующего user	
		}
		if(view.show_popup_select_sex()){
			hidePopupSex()
		}

		this.highlight(coor)
		click_sound()
	},
	hover: function(value) {
		this.over = !!value
		this.group.draw()
	}
};
