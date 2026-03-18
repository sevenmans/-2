"use strict";
const common_vendor = require("../../../common/vendor.js");
const stores_adminVenues = require("../../../stores/admin-venues.js");
const api_admin = require("../../../api/admin.js");
const utils_url = require("../../../utils/url.js");
const NavBar = () => "../../../components/NavBar.js";
const _sfc_main = {
  components: { NavBar },
  data() {
    return {
      venuesStore: null,
      navBarHeight: 0,
      saving: false,
      facilityTagsStr: "",
      venueTypes: ["篮球", "羽毛球", "网球", "足球", "乒乓球", "游泳", "其他"],
      form: {
        name: "",
        type: "篮球",
        price: "",
        openTime: "09:00",
        closeTime: "22:00",
        contactPhone: "",
        coverImage: "",
        location: "",
        description: "",
        supportSharing: false
      }
    };
  },
  onLoad() {
    this.venuesStore = stores_adminVenues.useAdminVenuesStore();
    this.calcNavBarHeight();
  },
  methods: {
    calcNavBarHeight() {
      const sys = common_vendor.index.getSystemInfoSync();
      this.navBarHeight = (sys.statusBarHeight || 0) + 44;
    },
    goBack() {
      common_vendor.index.navigateBack();
    },
    onTypeChange(e) {
      this.form.type = this.venueTypes[e.detail.value];
    },
    chooseImage() {
      common_vendor.index.chooseImage({
        count: 1,
        success: (res) => {
          const tempPath = res.tempFilePaths[0];
          this.uploadCoverImage(tempPath);
        }
      });
    },
    async uploadCoverImage(filePath) {
      try {
        common_vendor.index.showLoading({ title: "上传中..." });
        const res = await api_admin.uploadVenueImage(filePath);
        const data = res.data || res;
        const url = data.imageUrl || data.url || data.path;
        if (!url)
          throw new Error("未获取到图片地址");
        this.form.coverImage = url;
      } catch (e) {
        common_vendor.index.showToast({ title: e.message || "图片上传失败", icon: "none" });
      } finally {
        common_vendor.index.hideLoading();
      }
    },
    resolveFileUrl: utils_url.resolveFileUrl,
    validate() {
      if (!this.form.name.trim()) {
        common_vendor.index.showToast({ title: "请输入场馆名称", icon: "none" });
        return false;
      }
      if (!this.form.price) {
        common_vendor.index.showToast({ title: "请输入价格", icon: "none" });
        return false;
      }
      if (!this.form.openTime || !this.form.closeTime) {
        common_vendor.index.showToast({ title: "请设置营业时间", icon: "none" });
        return false;
      }
      return true;
    },
    async handleSave() {
      if (this.saving || !this.validate())
        return;
      this.saving = true;
      const tags = this.facilityTagsStr.split(",").map((t) => t.trim()).filter(Boolean);
      const data = {
        name: this.form.name,
        type: this.form.type,
        location: this.form.location,
        description: this.form.description,
        image: this.form.coverImage,
        features: tags,
        facilities: tags.join(","),
        contactPhone: this.form.contactPhone,
        supportSharing: this.form.supportSharing,
        openTime: this.form.openTime,
        closeTime: this.form.closeTime,
        status: "OPEN",
        price: Number(this.form.price)
      };
      try {
        await this.venuesStore.saveVenue(data);
        common_vendor.index.showToast({ title: "创建成功", icon: "success" });
        setTimeout(() => common_vendor.index.navigateBack(), 1500);
      } catch (e) {
        common_vendor.index.showToast({ title: e.message || "创建失败", icon: "none" });
      } finally {
        this.saving = false;
      }
    }
  }
};
if (!Array) {
  const _component_NavBar = common_vendor.resolveComponent("NavBar");
  _component_NavBar();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o($options.goBack),
    b: common_vendor.p({
      title: "新增场馆",
      showBack: true,
      backgroundColor: "#ff6b35",
      titleColor: "#ffffff",
      showBorder: false
    }),
    c: $data.form.name,
    d: common_vendor.o(($event) => $data.form.name = $event.detail.value),
    e: common_vendor.t($data.form.type || "请选择类型"),
    f: $data.venueTypes,
    g: common_vendor.o((...args) => $options.onTypeChange && $options.onTypeChange(...args)),
    h: $data.form.price,
    i: common_vendor.o(($event) => $data.form.price = $event.detail.value),
    j: common_vendor.t($data.form.openTime || "开始时间"),
    k: $data.form.openTime,
    l: common_vendor.o((e) => $data.form.openTime = e.detail.value),
    m: common_vendor.t($data.form.closeTime || "结束时间"),
    n: $data.form.closeTime,
    o: common_vendor.o((e) => $data.form.closeTime = e.detail.value),
    p: $data.form.contactPhone,
    q: common_vendor.o(($event) => $data.form.contactPhone = $event.detail.value),
    r: $data.form.coverImage
  }, $data.form.coverImage ? {
    s: $options.resolveFileUrl($data.form.coverImage)
  } : {}, {
    t: common_vendor.o((...args) => $options.chooseImage && $options.chooseImage(...args)),
    v: $data.form.location,
    w: common_vendor.o(($event) => $data.form.location = $event.detail.value),
    x: $data.form.description,
    y: common_vendor.o(($event) => $data.form.description = $event.detail.value),
    z: $data.facilityTagsStr,
    A: common_vendor.o(($event) => $data.facilityTagsStr = $event.detail.value),
    B: $data.form.supportSharing,
    C: common_vendor.o((e) => $data.form.supportSharing = e.detail.value),
    D: common_vendor.t($data.saving ? "保存中..." : "保存"),
    E: $data.saving ? 1 : "",
    F: common_vendor.o((...args) => $options.handleSave && $options.handleSave(...args)),
    G: $data.navBarHeight + "px"
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-8a7773b5"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../../.sourcemap/mp-weixin/pages/admin/venues/create.js.map
