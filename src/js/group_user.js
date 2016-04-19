function GroupsUsers(){ };

GroupsUsers.createGroup = function(){
	var groups = view.groups_users;
	var l = groups().length;
	var obj = {};
	var id = l > 0 ? groups()[l-1].id + 1 : 0;

	obj.check = ko.observable( l == 0 ? true : false);
	if(l == 0) {
		view.item_group(obj)
	}
	obj.id = id;
	obj.filter_sex = false;
	obj.name = 'Группа ' + (id+1);
	obj.seat = ko.observableArray();
	obj.user = ko.observableArray();
	groups.push(obj);
};
GroupsUsers.setGroup = function(obj, index){

	if(view.item_group() && obj.id !== view.item_group().id) {
		view.item_group().check(false);
		obj.check(true);
		view.item_group(obj);
	} else {
		view.item_group(obj);
	}
	
}
GroupsUsers.remGroup = function(obj, index){

	var groups = view.groups_users();
	var users = obj.user()
	users.forEach(function(item){
		item.d_check(false);
		item.id_group(false);
	});
	view.groups_users.splice(index, 1);

	if(view.groups_users().length == 0) {
		view.item_group(false)
	}
};
GroupsUsers.checkReserv = function(obj, new_seat){
	var seat = obj.seat();
	
	var odd  = 0; // нечетные
	var even = 0; // четные
	seat.forEach(function(itm, index){	
		var num = (+itm.name)%2;
		if(num === 0) {
			even += 1;
		} else {
			odd  += 1;
		}
	})
	if(even > 0 && even > 0) {
		if(even > odd || 
		  (even == odd && (+new_seat.num)%2 == 0)){
			return true
		} else {
			return false
		}
	} else {
		return true
	}
},

GroupsUsers.searchVal = function(arr, id){
	var res = undefined;

	arr.forEach(function(val, i){
		if(val.id.toString() == id.toString() && res == undefined) {
			res = i
		}
	})
	return res
}
GroupsUsers.addSear = function(seat){
	var obj = view.item_group();
	var index = GroupsUsers.searchVal(obj.seat(), seat.id);
	var check_reserv = GroupsUsers.checkReserv(obj, seat);
	// console.log('checkReserv',check_reserv)
	if(index === undefined) {
		obj.seat.push(seat);
		seat.marker_check.check = true;
	} else {
		obj.seat.splice(index, 1);
		seat.marker_check.check = false;
	}
},
GroupsUsers.addUser = function(user){
	var item_group = view.item_group;
	var index = GroupsUsers.searchVal(item_group().user(), user.id);

	if(index === undefined) {
		user.d_check(true);
		user.id_group(item_group().id);
		item_group().user.push(user);
	} else {
		user.d_check(false);
		user.id_group(false);
		item_group().user.splice(index, 1);
	}
};