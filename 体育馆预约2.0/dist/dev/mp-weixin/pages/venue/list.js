"use strict";
const common_vendor = require("../../common/vendor.js");
const stores_venue = require("../../stores/venue.js");
const _sfc_main = {
  name: "VenueList",
  components: {
    // 使用easycom自动注册组件
  },
  data() {
    return {
      venueStore: null,
      searchKeyword: "",
      selectedType: "",
      searchInputTimer: null,
      // 搜索输入防抖定时器
      // 弹窗状态控制
      internalPopupOpened: false,
      popupPosition: null,
      // 存储弹窗位置信息
      _popupRef: null,
      // 缓存弹窗引用
      // 筛选选项
      filterOptions: {
        minPrice: "",
        maxPrice: "",
        distance: "",
        facilities: []
      },
      // 距离选项
      distanceOptions: [
        { label: "1km内", value: 1 },
        { label: "3km内", value: 3 },
        { label: "5km内", value: 5 },
        { label: "10km内", value: 10 }
      ],
      // 设施选项
      facilityOptions: [
        { label: "停车场", value: "parking" },
        { label: "淋浴间", value: "shower" },
        { label: "更衣室", value: "locker" },
        { label: "WiFi", value: "wifi" },
        { label: "空调", value: "ac" },
        { label: "器材租赁", value: "equipment" }
      ],
      // 缓存相关
      lastRefreshTime: 0,
      cacheTimeout: 3e4,
      // 30秒缓存
      isRefreshing: false
    };
  },
  computed: {
    venueList() {
      var _a;
      return ((_a = this.venueStore) == null ? void 0 : _a.venueListGetter) || [];
    },
    venueTypes() {
      var _a;
      return ((_a = this.venueStore) == null ? void 0 : _a.venueTypesGetter) || [];
    },
    searchResults() {
      var _a;
      return ((_a = this.venueStore) == null ? void 0 : _a.searchResultsGetter) || [];
    },
    loading() {
      var _a;
      return ((_a = this.venueStore) == null ? void 0 : _a.isLoading) || false;
    },
    pagination() {
      var _a;
      return ((_a = this.venueStore) == null ? void 0 : _a.getPagination) || { current: 0, totalPages: 0 };
    },
    filteredVenues() {
      if (this.searchKeyword && this.searchKeyword.trim()) {
        if (!Array.isArray(this.searchResults) || this.searchResults.length === 0) {
          const keyword = this.searchKeyword.trim().toLowerCase();
          const filtered = this.venueList.filter((venue) => {
            if (!venue)
              return false;
            const nameMatch = venue.name && venue.name.toLowerCase().includes(keyword);
            const locationMatch = venue.location && venue.location.toLowerCase().includes(keyword);
            const typeMatch = venue.type && venue.type.toLowerCase().includes(keyword);
            return nameMatch || locationMatch || typeMatch;
          });
          return filtered;
        }
        return Array.isArray(this.searchResults) ? this.searchResults : [];
      }
      return Array.isArray(this.venueList) ? this.venueList : [];
    },
    hasMore() {
      return this.pagination && this.pagination.current < this.pagination.totalPages;
    }
  },
  onLoad() {
    this.venueStore = stores_venue.useVenueStore();
    if (!this.venueStore) {
      common_vendor.index.__f__("error", "at pages/venue/list.vue:284", "VenueStore初始化失败");
      common_vendor.index.showToast({
        title: "Store初始化失败",
        icon: "error"
      });
      return;
    }
    this.initData();
    setTimeout(() => {
      if (this.$refs.filterPopup) {
        this._popupRef = this.$refs.filterPopup;
      }
    }, 100);
  },
  onShow() {
    this.refreshDataWithCache();
  },
  onPullDownRefresh() {
    this.refreshData();
  },
  onReachBottom() {
    if (this.hasMore && !this.loading) {
      this.loadMore();
    }
  },
  onUnload() {
    if (this.searchInputTimer) {
      clearTimeout(this.searchInputTimer);
      this.searchInputTimer = null;
    }
  },
  onReady() {
    this.$nextTick(() => {
      setTimeout(() => {
        let popup = this.$refs.filterPopup;
        if (popup) {
          this._popupRef = popup;
        } else {
          setTimeout(() => {
            let popup2 = this.$refs.filterPopup;
            if (popup2) {
              this._popupRef = popup2;
            } else {
              setTimeout(() => {
                let popup3 = this.$refs.filterPopup;
                if (popup3) {
                  this._popupRef = popup3;
                }
              }, 1e3);
            }
          }, 500);
        }
      }, 500);
    });
  },
  // 添加onMounted生命周期钩子
  onMounted() {
    this.$nextTick(() => {
      const tryGetPopupRef = (attempt = 1) => {
        const popup = this.$refs.filterPopup;
        if (popup) {
          this._popupRef = popup;
          return true;
        }
        return false;
      };
      if (!tryGetPopupRef(1)) {
        setTimeout(() => {
          if (!tryGetPopupRef(2)) {
            setTimeout(() => {
              if (!tryGetPopupRef(3)) {
                setTimeout(() => {
                  tryGetPopupRef(4);
                }, 1e3);
              }
            }, 500);
          }
        }, 200);
      }
    });
  },
  mounted() {
  },
  methods: {
    // 初始化数据
    async initData() {
      try {
        const results = await Promise.all([
          this.venueStore.getVenueList({ page: 1, pageSize: 50 }),
          this.venueStore.getVenueTypes()
        ]);
        this.updatePagination();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/venue/list.vue:408", "初始化数据失败:", error);
        common_vendor.index.showToast({
          title: "数据加载失败",
          icon: "none"
        });
      }
    },
    // 刷新数据
    async refreshData() {
      try {
        await this.venueStore.getVenueList({ page: 1, pageSize: 50, refresh: true });
        this.updatePagination();
        common_vendor.index.stopPullDownRefresh();
      } catch (error) {
        common_vendor.index.stopPullDownRefresh();
        common_vendor.index.__f__("error", "at pages/venue/list.vue:425", "刷新数据失败:", error);
      }
    },
    // 加载更多
    async loadMore() {
      if (this.searchKeyword && this.searchKeyword.trim()) {
        return;
      }
      if (this.loading || !this.hasMore)
        return;
      try {
        const nextPage = this.pagination.current + 1;
        const params = {
          page: nextPage,
          pageSize: 50
        };
        if (this.selectedType) {
          params.type = this.selectedType;
        }
        if (this.filterOptions.minPrice) {
          params.minPrice = Number(this.filterOptions.minPrice);
        }
        if (this.filterOptions.maxPrice) {
          params.maxPrice = Number(this.filterOptions.maxPrice);
        }
        if (this.filterOptions.distance) {
          params.distance = this.filterOptions.distance;
        }
        if (this.filterOptions.facilities && Array.isArray(this.filterOptions.facilities) && this.filterOptions.facilities.length > 0) {
          params.facilities = this.filterOptions.facilities.join(",");
        }
        await this.venueStore.getVenueList(params);
        this.updatePagination();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/venue/list.vue:466", "加载更多失败:", error);
        common_vendor.index.showToast({
          title: "加载更多失败",
          icon: "error"
        });
      }
    },
    // 更新分页状态
    updatePagination() {
    },
    // 搜索输入处理
    onSearchInput() {
      if (this.searchInputTimer) {
        clearTimeout(this.searchInputTimer);
      }
      this.searchInputTimer = setTimeout(() => {
        try {
          if (!this.searchKeyword || !this.searchKeyword.trim()) {
            if (this.venueStore && this.venueStore.clearSearchResults) {
              this.venueStore.clearSearchResults();
            }
            return;
          }
          this.handleSearch();
        } catch (error) {
          common_vendor.index.__f__("error", "at pages/venue/list.vue:500", "[VenueList] 搜索输入处理失败:", error);
        }
      }, 800);
    },
    // 处理搜索
    async handleSearch() {
      const trimmedKeyword = this.searchKeyword ? this.searchKeyword.trim() : "";
      try {
        if (!trimmedKeyword) {
          this.venueStore.clearSearchResults();
          await this.venueStore.getVenueList({ page: 1, pageSize: 50, refresh: true });
          this.updatePagination();
          return;
        }
        const searchParams = {
          keyword: trimmedKeyword,
          page: 1,
          pageSize: 50
        };
        if (this.selectedType) {
          searchParams.type = this.selectedType;
        }
        if (this.filterOptions.minPrice) {
          searchParams.minPrice = Number(this.filterOptions.minPrice);
        }
        if (this.filterOptions.maxPrice) {
          searchParams.maxPrice = Number(this.filterOptions.maxPrice);
        }
        if (this.filterOptions.distance) {
          searchParams.distance = this.filterOptions.distance;
        }
        if (this.filterOptions.facilities && Array.isArray(this.filterOptions.facilities) && this.filterOptions.facilities.length > 0) {
          searchParams.facilities = this.filterOptions.facilities.join(",");
        }
        const searchResult = await this.venueStore.searchVenues(searchParams);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/venue/list.vue:545", "搜索失败:", error);
        common_vendor.index.showToast({
          title: "搜索失败，请重试",
          icon: "error"
        });
      }
    },
    // 选择场馆类型
    async selectType(typeId) {
      this.selectedType = typeId;
      if (typeId === "") {
        this.searchKeyword = "";
        this.resetFilter();
        this.venueStore.setSearchResults([]);
      }
      try {
        const params = {
          page: 1,
          pageSize: 50,
          refresh: true,
          ...this.filterOptions
        };
        if (typeId) {
          params.type = typeId;
        }
        await this.venueStore.getVenueList(params);
        this.updatePagination();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/venue/list.vue:582", "筛选失败:", error);
      }
    },
    // 跳转到详情页
    navigateToDetail(venue) {
      const status = String((venue == null ? void 0 : venue.status) || "").toUpperCase();
      if (status === "CLOSED") {
        common_vendor.index.showToast({
          title: "该球场已下架",
          icon: "none"
        });
        return;
      }
      common_vendor.index.navigateTo({
        url: `/pages/venue/detail?id=${venue.id}`
      });
    },
    // 显示筛选弹窗
    showFilterModal() {
      const debugEnabled = this.enablePopupDebug || false;
      this.internalPopupOpened = true;
      const sysInfo = {
        ...common_vendor.index.getWindowInfo(),
        ...common_vendor.index.getDeviceInfo(),
        ...common_vendor.index.getAppBaseInfo()
      };
      const openPopup = () => {
        let popup = null;
        popup = this.$refs.filterPopup;
        if (Array.isArray(popup)) {
          popup = popup[0];
        }
        if (!popup && this._popupRef) {
          popup = this._popupRef;
        }
        if (!popup && (sysInfo.platform === "mp-weixin" || sysInfo.platform === "devtools")) {
          try {
            if (this.$scope && typeof this.$scope.selectComponent === "function") {
              const componentInstance = this.$scope.selectComponent("#filter-popup-component");
              if (componentInstance && typeof componentInstance.open === "function") {
                popup = componentInstance;
                if (debugEnabled) {
                }
              } else if (componentInstance) {
                if (debugEnabled) {
                }
                if (componentInstance.$refs && componentInstance.$refs.popup) {
                  popup = componentInstance.$refs.popup;
                  if (debugEnabled) {
                  }
                } else if (typeof componentInstance.selectComponent === "function") {
                  try {
                    popup = componentInstance.selectComponent(".uni-popup");
                    if (debugEnabled) {
                    }
                  } catch (e) {
                    if (debugEnabled) {
                    }
                  }
                } else if (componentInstance.data && componentInstance.setData) {
                  if (debugEnabled) {
                  }
                  if (typeof componentInstance.open === "function") {
                    popup = componentInstance;
                  }
                }
              }
            }
          } catch (e) {
          }
        }
        if (popup) {
          if (typeof popup.open === "function") {
            try {
              popup.open("bottom");
              this._popupRef = popup;
              if (debugEnabled) {
              }
              if (sysInfo.platform === "mp-weixin" || sysInfo.platform === "devtools") {
                setTimeout(() => {
                  this.applyPopupStyles();
                }, 50);
              }
              return true;
            } catch (e) {
              if (debugEnabled) {
                common_vendor.index.__f__("error", "at pages/venue/list.vue:709", "打开弹窗时发生错误:", e);
              }
              return false;
            }
          } else {
            if (debugEnabled) {
              common_vendor.index.__f__("error", "at pages/venue/list.vue:715", "组件实例没有open方法，尝试备选方案");
            }
            this.internalPopupOpened = true;
            this.$forceUpdate();
            setTimeout(() => {
              const popupEl = document.querySelector("#filter-popup-component");
              if (popupEl) {
                popupEl.style.display = "block";
                popupEl.style.zIndex = "999";
                return true;
              }
            }, 100);
            return false;
          }
        } else {
          if (debugEnabled) {
            common_vendor.index.__f__("error", "at pages/venue/list.vue:737", "filterPopup ref未找到或open未就绪(env: " + sysInfo.platform + "," + sysInfo.uniPlatform + "," + sysInfo.SDKVersion + ")");
          }
          return false;
        }
      };
      if (!openPopup()) {
        setTimeout(() => {
          if (!openPopup()) {
            if (debugEnabled) {
              common_vendor.index.__f__("error", "at pages/venue/list.vue:749", "弹窗打开失败，请检查组件是否正确渲染");
              common_vendor.index.showToast({
                title: "弹窗打开失败",
                icon: "none"
              });
            }
          }
        }, 100);
      }
    },
    // 强制创建弹窗
    forceCreatePopup() {
      const debugEnabled = this.enablePopupDebug || false;
      const sysInfo = {
        ...common_vendor.index.getWindowInfo(),
        ...common_vendor.index.getDeviceInfo(),
        ...common_vendor.index.getAppBaseInfo()
      };
      common_vendor.index.showToast({
        title: "正在准备筛选...",
        icon: "none",
        duration: 1500
      });
      this.$forceUpdate();
      const query = common_vendor.index.createSelectorQuery().in(this);
      query.select("#filter-popup-component").boundingClientRect((data) => {
        if (data) {
          this.popupPosition = {
            ...this.popupPosition,
            forceCreateRect: data,
            timestamp: Date.now()
          };
        }
      }).exec();
      setTimeout(() => {
        let popup = null;
        popup = this.$refs.filterPopup;
        if (Array.isArray(popup)) {
          popup = popup[0];
        }
        if (!popup && this._popupRef) {
          popup = this._popupRef;
        }
        if (!popup && (sysInfo.platform === "mp-weixin" || sysInfo.platform === "devtools")) {
          try {
            if (this.$scope && typeof this.$scope.selectComponent === "function") {
              popup = this.$scope.selectComponent("#filter-popup-component");
              if (debugEnabled) {
              }
            }
          } catch (e) {
          }
        }
        if (popup && typeof popup.open === "function") {
          try {
            popup.open("bottom");
            this._popupRef = popup;
            this.internalPopupOpened = true;
            if (debugEnabled) {
            }
            setTimeout(() => {
              this.applyPopupStyles();
              if (sysInfo.platform === "mp-weixin" || sysInfo.platform === "devtools") {
                try {
                  const styleId = "filter-popup-fix-style";
                  let styleEl = document.getElementById(styleId);
                  if (!styleEl) {
                    styleEl = document.createElement("style");
                    styleEl.id = styleId;
                    document.head.appendChild(styleEl);
                  }
                  styleEl.innerHTML = `
                    #uni-popup-bottom {
                      bottom: 0 !important;
                      left: 0 !important;
                      right: 0 !important;
                      position: fixed !important;
                      z-index: 999 !important;
                    }
                    .uni-popup-bottom {
                      bottom: 0 !important;
                      left: 0 !important;
                      right: 0 !important;
                      position: fixed !important;
                      z-index: 999 !important;
                    }
                  `;
                } catch (styleError) {
                  if (debugEnabled) {
                    common_vendor.index.__f__("error", "at pages/venue/list.vue:883", "应用强制样式失败:", styleError);
                  }
                }
              }
            }, 100);
          } catch (e) {
            if (debugEnabled) {
              common_vendor.index.__f__("error", "at pages/venue/list.vue:890", "forceCreatePopup: 打开弹窗时发生错误:", e);
            }
            this.fallbackToRefsMethod();
          }
        } else {
          this.fallbackToRefsMethod();
        }
      }, 200);
    },
    // 回退到$refs方式的方法
    fallbackToRefsMethod() {
      const debugEnabled = this.enablePopupDebug || false;
      let popup = null;
      if (this._popupRef && typeof this._popupRef.open === "function") {
        popup = this._popupRef;
      } else if (this.$refs.filterPopup) {
        if (Array.isArray(this.$refs.filterPopup)) {
          popup = this.$refs.filterPopup[0];
        } else {
          popup = this.$refs.filterPopup;
        }
      }
      if (popup && typeof popup.open === "function") {
        popup.open("bottom");
        this._popupRef = popup;
        this.internalPopupOpened = true;
        setTimeout(() => {
          this.applyPopupStyles();
        }, 50);
      } else {
        if (debugEnabled) {
          common_vendor.index.showToast({
            title: "弹窗未就绪，请稍后再试",
            icon: "none"
          });
        }
      }
    },
    closeFilterModal() {
      const debugEnabled = this.enablePopupDebug || false;
      this.internalPopupOpened = false;
      const sysInfo = {
        ...common_vendor.index.getWindowInfo(),
        ...common_vendor.index.getDeviceInfo(),
        ...common_vendor.index.getAppBaseInfo()
      };
      const tryClosePopup = (retryCount = 0) => {
        let popup = null;
        popup = this.$refs.filterPopup;
        if (Array.isArray(popup)) {
          popup = popup[0];
        }
        if (!popup && this._popupRef) {
          popup = this._popupRef;
        }
        if (!popup && (sysInfo.platform === "mp-weixin" || sysInfo.platform === "devtools")) {
          try {
            if (this.$scope && typeof this.$scope.selectComponent === "function") {
              const componentInstance = this.$scope.selectComponent("#filter-popup-component");
              if (componentInstance === null) {
                if (debugEnabled) {
                }
              } else if (componentInstance && typeof componentInstance.close === "function") {
                popup = componentInstance;
                if (debugEnabled) {
                }
              } else if (componentInstance) {
                if (debugEnabled) {
                }
                if (componentInstance.$refs && componentInstance.$refs.popup) {
                  popup = componentInstance.$refs.popup;
                  if (debugEnabled) {
                  }
                } else if (typeof componentInstance.selectComponent === "function") {
                  try {
                    popup = componentInstance.selectComponent(".uni-popup");
                    if (debugEnabled) {
                    }
                  } catch (e) {
                    if (debugEnabled) {
                    }
                  }
                }
              }
            }
          } catch (e) {
          }
        }
        if (popup) {
          this._popupRef = popup;
        }
        if (popup && typeof popup.close === "function") {
          try {
            popup.close();
            this.internalPopupOpened = false;
            if (debugEnabled) {
            }
            return true;
          } catch (e) {
            if (debugEnabled) {
              common_vendor.index.__f__("error", "at pages/venue/list.vue:1046", "关闭弹窗失败:", e);
            }
            return false;
          }
        } else if (popup) {
          this.internalPopupOpened = false;
          this.$forceUpdate();
          setTimeout(() => {
            const popupEl = document.querySelector("#filter-popup-component");
            if (popupEl) {
              popupEl.style.display = "none";
            }
          }, 50);
          return true;
        } else {
          if (debugEnabled) {
            common_vendor.index.__f__("error", "at pages/venue/list.vue:1073", `关闭弹窗失败: ref未找到或close方法未就绪 (尝试${retryCount + 1}次)(env: ${sysInfo.platform},${sysInfo.uniPlatform},${sysInfo.SDKVersion})`);
          }
          return false;
        }
      };
      if (!tryClosePopup(0)) {
        setTimeout(() => {
          if (!tryClosePopup(1)) {
            if (debugEnabled) {
              common_vendor.index.__f__("error", "at pages/venue/list.vue:1085", "多次尝试关闭弹窗失败，强制更新内部状态");
            }
            this.internalPopupOpened = false;
            if (sysInfo.platform === "mp-weixin" || sysInfo.platform === "devtools") {
              const query = common_vendor.index.createSelectorQuery().in(this);
              query.select("#filter-popup-component").boundingClientRect((data) => {
                if (data) {
                  this.$forceUpdate();
                }
              }).exec();
            }
            if (debugEnabled) {
              common_vendor.index.showToast({
                title: "关闭弹窗遇到问题",
                icon: "none",
                duration: 1500
              });
            }
          }
        }, 100);
      }
    },
    // 应用弹窗样式，确保在微信小程序中正确显示
    applyPopupStyles() {
      try {
        const sysInfo = {
          ...common_vendor.index.getWindowInfo(),
          ...common_vendor.index.getDeviceInfo(),
          ...common_vendor.index.getAppBaseInfo()
        };
        this.popupPosition = {
          platform: sysInfo.platform,
          windowHeight: sysInfo.windowHeight,
          windowWidth: sysInfo.windowWidth,
          pixelRatio: sysInfo.pixelRatio,
          timestamp: Date.now()
        };
        setTimeout(() => {
          const query = common_vendor.index.createSelectorQuery().in(this);
          query.select(".uni-popup").boundingClientRect((data) => {
            if (data) {
              this.popupPosition.popupRect = data;
            }
          }).exec();
        }, 100);
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/venue/list.vue:1146", "应用弹窗样式失败:", e);
      }
    },
    // 处理弹窗状态变化
    popupChange(e) {
      const sysInfo = {
        ...common_vendor.index.getWindowInfo(),
        ...common_vendor.index.getDeviceInfo(),
        ...common_vendor.index.getAppBaseInfo()
      };
      if (e.show === false) {
        this.internalPopupOpened = false;
      } else if (e.show === true) {
        this.internalPopupOpened = true;
        let popup = this.$refs.filterPopup;
        if (Array.isArray(popup))
          popup = popup[0];
        if (popup) {
          this._popupRef = popup;
          if (sysInfo.platform === "devtools" || sysInfo.platform === "mp-weixin") {
            this.applyPopupStyles();
          }
          setTimeout(() => {
            const popupWrapper = document.getElementById("popup-wrapper");
            if (popupWrapper) {
              if (sysInfo.platform === "mp-weixin") {
                this.applyPopupStyles();
              }
            }
          }, 50);
        } else {
          common_vendor.index.__f__("error", "at pages/venue/list.vue:1193", "弹窗打开但无法获取引用");
          setTimeout(() => {
            const delayedPopup = this.$refs.filterPopup;
            if (delayedPopup) {
              this._popupRef = delayedPopup;
              this.applyPopupStyles();
            }
          }, 100);
        }
      }
    },
    // 应用弹窗样式（解决微信小程序中的定位问题）
    applyPopupStyles() {
      try {
        const sysInfo = {
          ...common_vendor.index.getWindowInfo(),
          ...common_vendor.index.getDeviceInfo(),
          ...common_vendor.index.getAppBaseInfo()
        };
        if (sysInfo.platform !== "mp-weixin" && sysInfo.platform !== "devtools") {
          return;
        }
        this.popupPosition = {
          platform: sysInfo.platform,
          windowHeight: sysInfo.windowHeight,
          windowWidth: sysInfo.windowWidth,
          statusBarHeight: sysInfo.statusBarHeight,
          safeAreaInsets: sysInfo.safeAreaInsets || {}
        };
        setTimeout(() => {
          const query = common_vendor.index.createSelectorQuery().in(this);
          query.select("#filter-popup-component").boundingClientRect((data) => {
            if (data) {
              this.popupPosition.popupRect = data;
              let popup = this.$refs.filterPopup;
              if (Array.isArray(popup)) {
                popup = popup[0];
              }
              if (!popup && this._popupRef) {
                popup = this._popupRef;
              }
              const popupExists = !!popup;
              const hasOpenMethod = popup && typeof popup.open === "function";
              if (popupExists && hasOpenMethod) {
              } else {
              }
            } else {
            }
          }).exec();
        }, 100);
      } catch (e) {
        common_vendor.index.__f__("error", "at pages/venue/list.vue:1265", "应用弹窗样式失败:", e);
      }
    },
    // 选择距离
    selectDistance(distance) {
      this.filterOptions.distance = distance;
    },
    // 切换设施选择
    toggleFacility(facility) {
      if (!Array.isArray(this.filterOptions.facilities)) {
        this.filterOptions.facilities = [];
      }
      const index = this.filterOptions.facilities.indexOf(facility);
      if (index > -1) {
        this.filterOptions.facilities.splice(index, 1);
      } else {
        this.filterOptions.facilities.push(facility);
      }
    },
    // 重置筛选
    resetFilter() {
      this.filterOptions = {
        minPrice: "",
        maxPrice: "",
        distance: "",
        facilities: []
      };
    },
    // 应用筛选
    async applyFilter() {
      this.closeFilterModal();
      try {
        if (this.searchKeyword && this.searchKeyword.trim()) {
          const params = {
            keyword: this.searchKeyword.trim()
          };
          if (this.selectedType) {
            params.type = this.selectedType;
          }
          if (this.filterOptions.minPrice) {
            params.minPrice = Number(this.filterOptions.minPrice);
          }
          if (this.filterOptions.maxPrice) {
            params.maxPrice = Number(this.filterOptions.maxPrice);
          }
          if (this.filterOptions.distance) {
            params.distance = this.filterOptions.distance;
          }
          if (this.filterOptions.facilities && this.filterOptions.facilities.length > 0) {
            params.facilities = this.filterOptions.facilities.join(",");
          }
          await this.venueStore.searchVenues(params);
        } else {
          const params = {
            page: 1,
            pageSize: 50,
            refresh: true
          };
          if (this.selectedType) {
            params.type = this.selectedType;
          }
          if (this.filterOptions.minPrice) {
            params.minPrice = Number(this.filterOptions.minPrice);
          }
          if (this.filterOptions.maxPrice) {
            params.maxPrice = Number(this.filterOptions.maxPrice);
          }
          if (this.filterOptions.distance) {
            params.distance = this.filterOptions.distance;
          }
          if (this.filterOptions.facilities && this.filterOptions.facilities.length > 0) {
            params.facilities = this.filterOptions.facilities.join(",");
          }
          await this.venueStore.getVenueList(params);
          this.updatePagination();
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/venue/list.vue:1362", "应用筛选失败:", error);
        common_vendor.index.showToast({
          title: "筛选失败，请重试",
          icon: "error"
        });
      }
    },
    // 获取状态样式类
    getStatusClass(status) {
      const normalized = String(status || "").toUpperCase();
      const statusMap = {
        "OPEN": "status-available",
        "AVAILABLE": "status-available",
        "CLOSED": "status-occupied",
        "MAINTENANCE": "status-maintenance",
        "OCCUPIED": "status-occupied"
      };
      return statusMap[normalized] || "status-available";
    },
    // 获取状态文本
    getStatusText(status) {
      const normalized = String(status || "").toUpperCase();
      const statusMap = {
        "OPEN": "可预约",
        "AVAILABLE": "可预约",
        "CLOSED": "不可用",
        "MAINTENANCE": "维护中",
        "OCCUPIED": "已满"
      };
      return statusMap[normalized] || "可预约";
    },
    // 缓存优化的刷新方法
    async refreshDataWithCache() {
      const now = Date.now();
      if (now - this.lastRefreshTime < this.cacheTimeout && !this.isRefreshing) {
        return;
      }
      if (this.isRefreshing) {
        return;
      }
      try {
        this.isRefreshing = true;
        const shouldRefresh = !this.venueList.length || !this.venueTypes.length || now - this.lastRefreshTime > this.cacheTimeout;
        if (shouldRefresh) {
          common_vendor.index.showLoading({
            title: "正在刷新数据..."
          });
          const refreshParams = {
            page: 1,
            pageSize: 50,
            refresh: true,
            compress: true
          };
          const refreshStartTime = Date.now();
          await Promise.all([
            this.venueStore.getVenueList(refreshParams),
            this.venueStore.getVenueTypes()
          ]);
          const refreshDuration = Date.now() - refreshStartTime;
          this.lastRefreshTime = now;
          try {
            common_vendor.index.setStorageSync("venue_list_cache", {
              venueList: this.venueList,
              venueTypes: this.venueTypes,
              timestamp: now
            });
          } catch (e) {
          }
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({
            title: "数据刷新完成",
            icon: "success",
            duration: 1500
          });
        } else {
        }
        this.updatePagination();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/venue/list.vue:1470", "缓存刷新失败:", error);
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({
          title: "数据刷新失败",
          icon: "error"
        });
      } finally {
        this.isRefreshing = false;
      }
    }
  }
};
if (!Array) {
  const _component_uni_popup = common_vendor.resolveComponent("uni-popup");
  _component_uni_popup();
}
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o([($event) => $data.searchKeyword = $event.detail.value, (...args) => $options.onSearchInput && $options.onSearchInput(...args)]),
    b: common_vendor.o((...args) => $options.handleSearch && $options.handleSearch(...args)),
    c: $data.searchKeyword,
    d: common_vendor.o((...args) => $options.handleSearch && $options.handleSearch(...args)),
    e: $data.selectedType === "" ? 1 : "",
    f: common_vendor.o(($event) => $options.selectType("")),
    g: common_vendor.f($options.venueTypes && Array.isArray($options.venueTypes) ? $options.venueTypes : [], (type, k0, i0) => {
      return {
        a: common_vendor.t(type.name),
        b: type.id,
        c: $data.selectedType === type.id ? 1 : "",
        d: common_vendor.o(($event) => $options.selectType(type.id), type.id)
      };
    }),
    h: common_vendor.o((...args) => $options.showFilterModal && $options.showFilterModal(...args)),
    i: common_vendor.f($options.filteredVenues && Array.isArray($options.filteredVenues) ? $options.filteredVenues : [], (venue, k0, i0) => {
      return common_vendor.e({
        a: venue.image || "/static/default-venue.jpg",
        b: common_vendor.t(venue.name || "未知场馆"),
        c: common_vendor.t(venue.location || "位置未知"),
        d: common_vendor.t(venue.type || "运动场馆"),
        e: venue.supportSharing
      }, venue.supportSharing ? {} : {}, {
        f: common_vendor.t(venue.price || 0),
        g: common_vendor.t($options.getStatusText(venue.status)),
        h: common_vendor.n($options.getStatusClass(venue.status)),
        i: venue.id,
        j: common_vendor.o(($event) => $options.navigateToDetail(venue), venue.id)
      });
    }),
    j: (!$options.filteredVenues || !Array.isArray($options.filteredVenues) || $options.filteredVenues.length === 0) && !$options.loading
  }, (!$options.filteredVenues || !Array.isArray($options.filteredVenues) || $options.filteredVenues.length === 0) && !$options.loading ? {
    k: common_vendor.t($data.searchKeyword ? "未找到相关场馆" : "暂无场馆数据")
  } : {}, {
    l: $options.hasMore
  }, $options.hasMore ? {
    m: common_vendor.t($options.loading ? "加载中..." : "加载更多"),
    n: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args))
  } : {}, {
    o: common_vendor.o((...args) => $options.closeFilterModal && $options.closeFilterModal(...args)),
    p: $data.filterOptions.minPrice,
    q: common_vendor.o(($event) => $data.filterOptions.minPrice = $event.detail.value),
    r: $data.filterOptions.maxPrice,
    s: common_vendor.o(($event) => $data.filterOptions.maxPrice = $event.detail.value),
    t: common_vendor.f($data.distanceOptions && Array.isArray($data.distanceOptions) ? $data.distanceOptions : [], (distance, k0, i0) => {
      return {
        a: common_vendor.t(distance.label),
        b: distance.value,
        c: $data.filterOptions.distance === distance.value ? 1 : "",
        d: common_vendor.o(($event) => $options.selectDistance(distance.value), distance.value)
      };
    }),
    v: common_vendor.f($data.facilityOptions && Array.isArray($data.facilityOptions) ? $data.facilityOptions : [], (facility, k0, i0) => {
      return {
        a: common_vendor.t(facility.label),
        b: facility.value,
        c: ($data.filterOptions.facilities && Array.isArray($data.filterOptions.facilities) ? $data.filterOptions.facilities : []).includes(facility.value) ? 1 : "",
        d: common_vendor.o(($event) => $options.toggleFacility(facility.value), facility.value)
      };
    }),
    w: common_vendor.o((...args) => $options.resetFilter && $options.resetFilter(...args)),
    x: common_vendor.o((...args) => $options.applyFilter && $options.applyFilter(...args)),
    y: $data.internalPopupOpened,
    z: common_vendor.sr("filterPopup", "17cb4dd5-0"),
    A: common_vendor.o($options.popupChange),
    B: common_vendor.p({
      id: "filter-popup-component",
      type: "bottom",
      ["mask-click"]: false,
      ["safe-area"]: false,
      animation: true,
      ["background-color"]: "#fff",
      ["custom-style"]: {
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999
      }
    })
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-17cb4dd5"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/venue/list.js.map
