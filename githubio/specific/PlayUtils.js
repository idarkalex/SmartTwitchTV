var PlayUtils = {
    makeControl: function (config) {
        return {
            ShowInLive: false,
            ShowInVod: false,
            ShowInClip: false,
            ShowInPP: false,
            ShowInMulti: false,
            ShowInChat: false,
            ShowInAudio: false,
            ShowInAudioPP: false,
            ShowInAudioMulti: false,
            ShowInPreview: false,
            ShowInStay: false,
            icons: '',
            offsetY: -8,
            string: '',
            values: null,
            defaultValue: null,
            enterKey: null,
            setLabel: null,
            updown: null,
            bottomArrows: null,
            visible: true,
            position: 0,
            doc: null,
            doc_title: null,
            doc_name: null,
            doc_up: null,
            doc_down: null,
            button: null,
            button_text: null
        };
    },

    setControlDefaults: function (overrides) {
        var control = PlayUtils.makeControl();
        var keys = Object.keys(overrides);
        var i = 0;
        for (i; i < keys.length; i++) {
            control[keys[i]] = overrides[keys[i]];
        }
        return control;
    },

    qualityIndexReset: function (qualities, quality, getQualitiesCount) {
        var index = 0,
            len = getQualitiesCount(),
            i = 0;

        for (i; i < len; i++) {
            if (qualities[i].id === quality) {
                index = i;
                break;
            } else if (Main_A_includes_B(qualities[i].id, quality)) {
                index = i;
            }
        }
        return index;
    },

    setHtmlQuality: function (qualities, qualityIndex, element, infoQuality) {
        if (!qualities.length || !qualities[qualityIndex] || !qualities[qualityIndex].hasOwnProperty('id')) return null;

        var quality = qualities[qualityIndex].id;
        var quality_string = '';

        if (Main_A_includes_B(quality, 'Auto')) {
            if (Main_IsOn_OSInterface) {
                quality_string = quality.replace('Auto', STR_AUTO);
            } else {
                if (infoQuality !== element) {
                    quality_string = quality.replace('Auto', STR_AUTO);
                } else {
                    quality_string = qualities[1].id.replace('source', STR_AUTO) + qualities[1].band + qualities[1].codec;
                }
            }
        } else if (Main_A_includes_B(quality, 'source')) {
            quality_string = quality.replace('source', STR_SOURCE);
        } else {
            quality_string = quality;
        }

        if (!Main_A_includes_B(quality, 'Auto')) {
            quality_string += qualities[qualityIndex].band + qualities[qualityIndex].codec;
        }

        return {quality: quality, display: quality_string};
    },

    setHtmlQualityClip: function (qualities, qualityIndex) {
        if (!qualities.length || !qualities[qualityIndex] || !qualities[qualityIndex].hasOwnProperty('id')) return null;

        var quality = qualities[qualityIndex].id;
        var quality_string = quality;

        if (Main_A_includes_B(quality, 'source')) {
            quality_string = quality_string.replace('source', STR_SOURCE);
        }

        return {quality: quality, display: quality_string};
    },

    fastBackForward: function (position, showPanelFn, setHidePanelFn) {
        if (!Play_isPanelShowing()) showPanelFn();
        Play_clearHidePanel();
        PlayVod_PanelY = 0;
        Play_BottomIconsFocus();

        PlayVod_jumpStart(position, Play_DurationSeconds);
        PlayVod_ProgressBaroffset = 2500;
        setHidePanelFn();
    },

    setArrowsOpacity: function (leftEl, rightEl, current, max) {
        if (current > 0 && current < max) {
            leftEl.style.opacity = '1';
            rightEl.style.opacity = '1';
        } else if (current === max) {
            leftEl.style.opacity = '1';
            rightEl.style.opacity = '0.2';
        } else {
            leftEl.style.opacity = '0.2';
            rightEl.style.opacity = '1';
        }
    },

    removeArrowsOpacity: function (leftEl, rightEl) {
        leftEl.style.opacity = '0';
        rightEl.style.opacity = '0';
    },

    storeChatPos: function (container, dialogEl) {
        return {
            height: container.style.height,
            marginTop: dialogEl.style.marginTop,
            top: container.style.top,
            left: container.style.left
        };
    },

    restoreChatPos: function (container, dialogEl, stored, showChat) {
        if (showChat) Play_showChat();
        else Play_hideChat();
        container.style.cssText = 'height:' + stored.height + ';top:' + stored.top + ';left:' + stored.left;
        dialogEl.style.marginTop = stored.marginTop;
    }
};
