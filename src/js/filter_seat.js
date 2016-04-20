function FilterSeat(){}

FilterSeat.checkSeat = function(seat, user){
	var res = true
	var num = {
		odd: 0,
		even: 0
	};
	for(var g = 0; g < groups.length; g++){
		var res_g = FilterSeat.checkGroup(groups[g], seat, user);
		if(res_g){
			num.odd += res_g.odd;
			num.even += res_g.even;
		}
	}
	res = num.odd > num.even ? false : true
	return {
		res: res, 
		odd: num.odd,
		even: num.even
	}
};
FilterSeat.checkGroup = function(groups,seat, user){
	var arr = groups.items;
	var odd  = 0; // нечетные
	var even = 0; // четные

	for(var i = 0; i < arr.length; i++){
		var itm = arr[i];

		if((!itm.user && !seat) || 
		  (seat && !itm.user && itm.id != seat.id)|| 
		  (user && user.seat && itm.id == user.seat.id)) continue
		var num = (+itm.name)%2;
		if(seat && itm.id == seat.id) {
			num = (+seat.name)%2;
		}

		if(num === 0) {
			even += 1;
		} else {
			odd  += 1;
		}
	}
	if(odd > even) {
		return {
			check: false,
			even: even,
			odd: odd
		}
	} else {
		return {
			check: true,
			even: even,
			odd: odd
		}
	}
},
FilterSeat.checkSeatSex = function(seat, user){
	var res = true;
	var arr = view.users();
	for(var i = 0; i < arr.length; i++){
		var itm = arr[i];
		if(user && itm.id == user.id) continue
		if(itm.seat && itm.seat.sex && itm.seat.sex !== itm.sex) {
			res = false
		}
	}
	if(seat && user) {
		if(seat.sex && seat.sex !== user.sex) {
			res = false
		}	
	}
	return res
}
FilterSeat.seatChild = function(seat, p_user){
	var id_c  = seat.id;
	var id_p  = p_user.seat.id;
	var num_c = id_c.split('-');
	var num_p = id_p.split('-');
	if(num_c[0] !== num_p[0]){ 
		return false
	} else {
		return true
	}
}