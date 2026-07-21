/*
 * Copyright (c) 2017–present Felipe de Leon <fglfgl27@gmail.com>
 *
 * This file is part of SmartTwitchTV <https://github.com/fgl27/SmartTwitchTV>
 *
 * SmartTwitchTV is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SmartTwitchTV is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with SmartTwitchTV.  If not, see <https://github.com/fgl27/SmartTwitchTV/blob/master/LICENSE>.
 *
 */

//To pass to Java
var Play_Headers;
//Live
var play_ExtraCodecsValues;

var Play_live_token_prop = 'streamPlaybackAccessToken';
var Play_live_token =
    // '{"operationName":"PlaybackAccessToken_Template","query":"query PlaybackAccessToken_Template($login: String!, $isLive: Boolean!, $vodID: ID!, $isVod: Boolean!, $playerType: String!, $platform: String!) ' +
    // '{  streamPlaybackAccessToken(channelName: $login, params: {platform: $platform, playerBackend: \\"mediaplayer\\", playerType: $playerType}) @include(if: $isLive) {    value    signature    __typename  } ' +
    // ' videoPlaybackAccessToken(id: $vodID, params: {platform: $platform, playerBackend: \\"mediaplayer\\", playerType: $playerType}) @include(if: $isVod) {    value    signature    __typename  }}",' +
    //'"variables":{"isLive":true,"login":"%x","isVod":false,"vodID":"","playerType":"mobile","platform":"ios"}}';
    '{"extensions":{"persistedQuery":{"sha256Hash":"ed230aa1e33e07eebb8928504583da78a5173989fadfb1ac94be06a04f3cdbe9","version":1}},' +
    '"operationName":"PlaybackAccessToken","variables":{"isLive":true,"isVod":false,"login":"%x","platform":"web","playerType":"site","vodID":""}}';

var Play_base_live_links =
    'player_backend=mediaplayer&reassignments_supported=true&playlist_include_framerate=true&allow_source=true&fast_bread=false&cdm=wv&acmb=e30%3D&p=%p&play_session_id=%i&player_version=1.13.0&supported_codecs=%c';

var Play_original_live_links = 'https://usher.ttvnw.net/api/channel/hls/';

var Play_live_ttv_lol_links = 'https://api.ttv.lol/playlist/';
var ttv_lol_headers = JSON.stringify([['X-Donate-To', 'https://ttv.lol/donate']]);

var ktwitch_proxy = 'https://api.twitch.hkg.kwabang.net/hls-raw/';

var T1080_proxy = 'http://192.168.1.56:8119';

var proxy_timeout = 5000;
var proxy_url = '';
var proxy_headers = null;
var proxy_has_parameter = false;
var proxy_has_token = false;
var proxy_is_forward_proxy = false;

//var proxy_ping_url = 'https://api.ttv.lol/ping';

var use_proxy = false;
var proxy_fail_counter = 0;
var proxy_fail_counter_checker = 0;

//VOD
var Play_vod_token_prop = 'videoPlaybackAccessToken';
var Play_vod_token = '{"query":"{videoPlaybackAccessToken(id:\\"%x\\", params:{platform:\\"android\\",playerType:\\"mobile\\"}){value signature}}"}';
var Play_vod_links =
    'https://usher.ttvnw.net/vod/%x.m3u8?nauth=%t&nauthsig=%s&reassignments_supported=true&playlist_include_framerate=true&allow_source=true&cdm=wv&p=%d&supported_codecs=%c';

function PlayHLS_GetPlayListAsync(isLive, Channel_or_VOD_Id, CheckId_y, CheckId_x, callBackSuccess) {
    Main_Log('Proxy: GetPlayListAsync channel=' + Channel_or_VOD_Id + ' isLive=' + isLive + ' use_proxy=' + use_proxy + ' proxy_has_token=' + proxy_has_token + ' proxy_url=' + proxy_url);

    //if at te end of a request the values are different we have a issues
    proxy_fail_counter_checker = proxy_fail_counter;

    if (use_proxy && isLive && !proxy_has_token) {
        Main_Log('Proxy: GetPlayListAsync -> direct playlist request via proxy (no token needed)');
        PlayHLS_PlayListUrl(isLive, Channel_or_VOD_Id, CheckId_y, CheckId_x, callBackSuccess.name, null, null, true);
    } else {
        Main_Log('Proxy: GetPlayListAsync -> get token first, useProxy=' + use_proxy);
        PlayHLS_GetToken(isLive, Channel_or_VOD_Id, CheckId_y, CheckId_x, callBackSuccess.name, use_proxy);
    }
}

function PlayHLS_GetToken(isLive, Channel_or_VOD_Id, CheckId_y, CheckId_x, callBackSuccess, useProxy) {
    OSInterface_XmlHttpGetFull(
        PlayClip_BaseUrl, //String urlString
        DefaultHttpGetTimeout, //int timeout
        (isLive ? Play_live_token : Play_vod_token).replace('%x', Channel_or_VOD_Id), // String postMessage
        'POST', //String Method
        Play_Headers, //String JsonHeadersArray
        'PlayHLS_GetTokenResult', //String callback
        CheckId_y, //long checkResult
        isLive ? '1' : '0', //String check_1
        useProxy ? '1' : '0', //String check_2
        Channel_or_VOD_Id.toString(), // String check_3
        null, // reserved for token result String check_4
        CheckId_x, // String check_5
        callBackSuccess, //String callBackSuccess
        null //String callBackError
    );
}

function PlayHLS_GetTokenResult(result, checkResult, check_1, check_2, check_3, check_4, check_5, callBackSuccess) {
    var isLive = check_1 === '1',
        useProxy = check_2 === '1',
        Channel_or_VOD_Id = check_3,
        CheckId_x = check_5;

    var response = JSON.parse(result);

    Main_Log('Proxy: GetTokenResult status=' + response.status + ' channel=' + Channel_or_VOD_Id + ' useProxy=' + useProxy);

    if (response.status === 200) {
        var obj = JSON.parse(response.responseText);

        if (obj.data && obj.data[isLive ? Play_live_token_prop : Play_vod_token_prop]) {
            var tokenObj = obj.data[isLive ? Play_live_token_prop : Play_vod_token_prop];
            var Token = tokenObj.value;
            var Sig = tokenObj.signature;

            Main_Log('Proxy: GetTokenResult -> token OK, proceeding to playlist');
            PlayHLS_PlayListUrl(isLive, Channel_or_VOD_Id, checkResult, CheckId_x, callBackSuccess, Token, Sig, useProxy);
            return;
        }
    }

    Main_Log('Proxy: GetTokenResult -> FAIL, token request failed');
    // prettier-ignore
    eval(callBackSuccess)(// jshint ignore:line
        null
    );
}

function PlayHLS_CheckToken(tokenString) {
    if (!tokenString) {
        return '0';
    }

    var Token = JSON.parse(tokenString);

    if (Token.chansub && Token.chansub.restricted_bitrates) {
        var restricted_bitrates = Token.chansub.restricted_bitrates;

        return restricted_bitrates.length ? '1' : '0';
    }

    return '0';
}

function PlayHLS_GetPlayListUrl(isLive, Channel_or_VOD_Id, Token, Sig, useProxy) {
    var url = '',
        headers;

    if (isLive) {
        var randomId = parseInt(Math.random() * 10000000000000000);
        var randomInt = parseInt(Math.random() * 100000000);
        var URL_parameters = Play_base_live_links.replace('%p', randomInt)
            .replace('%i', randomId + '' + randomId)
            .replace('%c', play_ExtraCodecsValues);

        if (useProxy) {
            headers = proxy_headers;

            if (proxy_is_forward_proxy) {
                OSInterface_SetProxyUrl(proxy_url);
                url = Play_original_live_links + Channel_or_VOD_Id + '.m3u8?token=' + encodeURIComponent(Token) + '&sig=' + Sig + '&' + URL_parameters;
                Main_Log('Proxy: GetPlayListUrl FORWARD_PROXY via=' + proxy_url + ' real_url=' + Play_original_live_links + ' has_headers=' + (headers !== null && headers !== undefined));
            } else {
                OSInterface_SetProxyUrl('');
                var proxy_base = proxy_url.endsWith('/') ? proxy_url : proxy_url + '/';

                if (proxy_has_parameter && !proxy_has_token) {
                    url = proxy_base + Channel_or_VOD_Id + '.m3u8' + encodeURIComponent('?' + URL_parameters);
                } else {
                    url = proxy_base + Channel_or_VOD_Id + '.m3u8?token=' + encodeURIComponent(Token) + '&sig=' + Sig + '&' + URL_parameters;
                }
                Main_Log('Proxy: GetPlayListUrl REVERSE_PROXY url=' + proxy_base + ' channel=' + Channel_or_VOD_Id + ' has_token=' + proxy_has_token + ' has_parameter=' + proxy_has_parameter + ' has_headers=' + (headers !== null && headers !== undefined));
            }
        } else {
            OSInterface_SetProxyUrl('');
            url = Play_original_live_links + Channel_or_VOD_Id + '.m3u8?token=' + encodeURIComponent(Token) + '&sig=' + Sig + '&' + URL_parameters;
            Main_Log('Proxy: GetPlayListUrl DIRECT url=' + Play_original_live_links + ' channel=' + Channel_or_VOD_Id);
        }
    } else {
        url = Play_vod_links.replace('%x', Channel_or_VOD_Id)
            .replace('%t', encodeURIComponent(Token))
            .replace('%s', Sig)
            .replace('%d', Math.random() * 100000)
            .replace('%c', play_ExtraCodecsValues);
    }

    return {url: url, headers: headers};
}

function PlayHLS_PlayListUrl(isLive, Channel_or_VOD_Id, CheckId_y, CheckId_x, callBackSuccess, Token, Sig, useProxy) {
    // console.log('isLive', isLive);
    // console.log('Channel_or_VOD_Id', Channel_or_VOD_Id);
    // console.log('CheckId_y', CheckId_y);
    // console.log('CheckId_x', CheckId_x);
    // console.log('callBackSuccess', callBackSuccess);
    // console.log('Token', Token);
    // console.log('Sig', Sig);
    // console.log('callBackSuccess', callBackSuccess);

    var urlObj = PlayHLS_GetPlayListUrl(isLive, Channel_or_VOD_Id, Token, Sig, useProxy);

    if (useProxy) {
        Main_Log('Proxy: PlayListUrl sending urlLen=' + urlObj.url.length + ' headers=' + (urlObj.headers !== null && urlObj.headers !== undefined) + ' timeout=' + (useProxy ? proxy_timeout : DefaultHttpGetTimeout));
    }

    OSInterface_XmlHttpGetFull(
        urlObj.url, //String urlString
        useProxy ? proxy_timeout : DefaultHttpGetTimeout, //int timeout
        null, // String postMessage
        null, //String Method
        urlObj.headers ? urlObj.headers : null, //String JsonHeadersArray
        'PlayHLS_PlayListUrlResult', //String callback
        CheckId_y, //long checkResult
        isLive ? '1' : '0', //String check_1
        useProxy ? '1' : '0', // String check_2
        Channel_or_VOD_Id, // String check_3
        PlayHLS_CheckToken(Token), // String check_4
        CheckId_x, // String check_5
        callBackSuccess, //String callBackSuccess
        null //String callBackError
    );
}

function PlayHLS_PlayListUrlResult(result, checkResult, check_1, check_2, check_3, check_4, check_5, callBackSuccess) {
    var CheckId_y = checkResult,
        isLive = check_1 === '1',
        useProxy = check_2 === '1',
        Channel_or_VOD_Id = check_3,
        Checked_Token = check_4,
        CheckId_x = check_5,
        response = JSON.parse(result);

    Main_Log('Proxy: PlayListUrlResult status=' + response.status + ' channel=' + Channel_or_VOD_Id + ' useProxy=' + useProxy + ' isLive=' + isLive);

    if (response.status !== 200) {
        Main_Log('Proxy: PlayListUrlResult FAIL status=' + response.status + ' response=' + response.responseText);
        //in case we fail using proxy restart the process without using proxy
        if (isLive && useProxy && PlayHLS_CheckProxyResultFail(response.responseText)) {
            Main_Log('Proxy: PlayListUrlResult -> FALLBACK to direct (no proxy)');
            PlayHLS_GetToken(isLive, Channel_or_VOD_Id, CheckId_y, CheckId_x, callBackSuccess, false);
            return;
        }

        result = JSON.stringify({
            status: Checked_Token === '1' ? 1 : response.status,
            responseText: response.responseText,
            checkResult: response.checkResult
        });
    } else {
        Main_Log('Proxy: PlayListUrlResult SUCCESS channel=' + Channel_or_VOD_Id + (useProxy ? ' (via PROXY)' : ' (DIRECT)'));
    }

    if (useProxy) {
        proxy_fail_counter = 0;
        Main_EventProxy(true);
    }

    // prettier-ignore
    eval(callBackSuccess)(// jshint ignore:line
        result,
       parseInt(CheckId_x),
       parseInt(CheckId_y)
    );

    if (useProxy) {
        Main_EventProxy(true);
    }
}

function PlayHLS_CheckProxyResultFail(responseText) {
    if (Main_A_includes_B(responseText, 'not_found: transcode does not exist')) {
        Main_Log('Proxy: CheckProxyResultFail -> transcode not found (stream offline, not proxy fail)');
        return false;
    }

    proxy_fail_counter++;
    Main_Log('Proxy: CheckProxyResultFail -> FAIL #' + proxy_fail_counter + ' responseText=' + responseText);
    Main_EventProxy(false);

    return true;
}

function PlayHLS_GetPlayListSync(isLive, Channel_or_VOD_Id) {
    //if at te end of a request the values are different we have a issues
    proxy_fail_counter_checker = proxy_fail_counter;

    try {
        return PlayHLS_GetPlayListSyncToken(isLive, Channel_or_VOD_Id, use_proxy);
    } catch (error) {
        console.log(error);
    }

    return null;
}

function PlayHLS_GetPlayListSyncToken(isLive, Channel_or_VOD_Id, useProxy) {
    var tokenObj, Token, Sig;

    Main_Log('Proxy: GetPlayListSyncToken channel=' + Channel_or_VOD_Id + ' useProxy=' + useProxy + ' proxy_has_token=' + proxy_has_token);

    if (useProxy && isLive && !proxy_has_token) {
        Main_Log('Proxy: GetPlayListSyncToken -> direct playlist via proxy (no token needed)');
        return PlayHLS_GetPlayListSyncUrl(isLive, Channel_or_VOD_Id, true);
    } else {
        //getToken
        var obj = OSInterface_mMethodUrlHeaders(
            PlayClip_BaseUrl, //urlString
            DefaultHttpGetTimeout / 2, //timeout
            (isLive ? Play_live_token : Play_vod_token).replace('%x', Channel_or_VOD_Id), //postMessage
            'POST', //Method
            0, //checkResult
            Play_Headers //JsonHeadersArray
        );

        if (obj) {
            var response = JSON.parse(obj);
            if (response && response.status === 200) {
                var tokenResult = JSON.parse(response.responseText);

                if (tokenResult.data && tokenResult.data[isLive ? Play_live_token_prop : Play_vod_token_prop]) {
                    tokenObj = tokenResult.data[isLive ? Play_live_token_prop : Play_vod_token_prop];
                    Token = tokenObj.value;
                    Sig = tokenObj.signature;

                    return PlayHLS_GetPlayListSyncUrl(isLive, Channel_or_VOD_Id, useProxy, Token, Sig, tokenObj);
                }
            }
        }
    }
    return null;
}

function PlayHLS_GetPlayListSyncUrl(isLive, Channel_or_VOD_Id, useProxy, Token, Sig, tokenObj) {
    var urlObj = PlayHLS_GetPlayListUrl(isLive, Channel_or_VOD_Id, Token, Sig, useProxy);

    Main_Log('Proxy: GetPlayListSyncUrl useProxy=' + useProxy + ' channel=' + Channel_or_VOD_Id);

    var obj = OSInterface_mMethodUrlHeaders(
        urlObj.url, //urlString
        useProxy ? proxy_timeout : DefaultHttpGetTimeout / 2, //timeout
        null, //postMessage
        null, //Method
        0, //checkResult
        urlObj.headers ? urlObj.headers : null //JsonHeadersArray
    );

    if (obj) {
        var response = JSON.parse(obj);

        if (response) {
            if (response.status === 200) {
                Main_Log('Proxy: GetPlayListSyncUrl SUCCESS' + (useProxy ? ' (via PROXY)' : ' (DIRECT)'));
                if (useProxy) {
                    proxy_fail_counter = 0;
                    Main_EventProxy(true);
                }
                return obj;
            } else {
                Main_Log('Proxy: GetPlayListSyncUrl FAIL status=' + response.status + ' response=' + response.responseText);
                //in case we fail using proxy restart the process without using proxy
                if (isLive && useProxy && PlayHLS_CheckProxyResultFail(response.responseText)) {
                    Main_Log('Proxy: GetPlayListSyncUrl -> FALLBACK to direct (no proxy)');
                    return PlayHLS_GetPlayListSyncToken(isLive, Channel_or_VOD_Id, false);
                } else {
                    return JSON.stringify({
                        status: PlayHLS_CheckToken(tokenObj) === '1' ? 1 : response.status,
                        responseText: response.responseText,
                        checkResult: response.checkResult
                    });
                }
            }
        }
    }

    return null;
}
