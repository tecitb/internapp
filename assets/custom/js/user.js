const SERVER_URL = "https://tec-rest.didithilmy.com/public";

var name, nickname, tecRegNo, jwt, uid;

/*Logout, delete token*/
function logout(){
    console.log("logout");
}

/*Login*/
// This variable is used to keep track if a server call is ongoing.
var isLoggingIn = false;

function login(email, passwd, callback) {
    if(!isLoggingIn) {
        isLoggingIn = true;
        console.log("loggingin");
        $.ajax({
            method: "POST",
            url: SERVER_URL + "/api/login",
            data: {email: email, password: passwd}
        }).done(function (msg) {
            isLoggingIn = false;
            console.log("done E= " + msg.message);
            if (typeof msg.error !== "undefined") {
                console.log("Error");
                callback(false, msg.message);
            } else {
                localforage.setItem('token', msg.token).then(function(value) {
                    jwt = value;
                }).catch(function(err) {
                    console.log(err);
                });

                localforage.setItem('uid', msg.uid).then(function(value) {
                    jwt = value;
                }).catch(function(err) {
                    console.log(err);
                });

                getProfile();
                callback(true, "");
            }
        }).fail(function() {
            isLoggingIn = false;
            callback(false, "Login failed, please try again");
        });
    }
}

function getProfile() {
    $.ajax({
        method: "GET",
        url: SERVER_URL+"/api/user/"+Cookies.get("uid"),
        headers: {"Authorization": "Bearer " + Cookies.get("token")}
    }).done(function( msg ) {
        localforage.setItem('name', msg.name).then(function(value) {
            name = value;
        }).catch(function(err) {
            console.log(err);
        });

        localforage.setItem('nickname', msg.nickname).then(function(value) {
            nickname = value;
        }).catch(function(err) {
            console.log(err);
        });

        localforage.setItem('tec_regno', msg.tec_regno).then(function(value) {
            tecRegNo = value;
        }).catch(function(err) {
            console.log(err);
        });

    }).fail(function( jqXHR, textStatus ) {
        alert("Get profile failed: " + textStatus);
    });

}