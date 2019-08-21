/*
 * @Description:对axios请求的封装
 * @Author: 水痕
 * @Github: https://github.com/kuangshp
 * @Email: 332904234@qq.com
 * @Company:
 * @Date: 2019-08-16 16:57:42
 * @LastEditors: 水痕
 * @LastEditTime: 2019-08-21 12:23:41
 */

import axios from 'axios';
import { storage } from './storage';
import { prefix, iamPrefix } from '@/api';
import { authMobile, authToken } from '@/config';
import routers from '../routers';

class AxiosRequest {
  public init() {
    axios.defaults.headers.post['Content-Type'] =
      'application/x-www-form-urlencoded;charset=UTF-8';
    axios.defaults.timeout = 60 * 1000;
    // 拦截请求的
    axios.interceptors.request.use(
      (config: { [propsName: string]: any }) => this.request(config),
      (rejection: { data: any }) => this.requestError(rejection),
    );
    // 拦截响应
    axios.interceptors.response.use(
      (res: any) => this.response(res),
      (error: any) => this.responseError(error),
    );
  }

  private request(config: { [propsName: string]: any }) {
    // 配置请求头
    config.headers['X-Origin'] = 'admin-web';
    config.headers[authToken] = storage.getItem(authToken);
    // config.headers[authMobile] = storage.getItem(authMobile);
    // 处理请求地址
    const input = config.url;
    if (this.isHttpUrl(input)) {
      config.url = input;
    } else if (this.isIamUrl(input)) {
      config.url = `${iamPrefix}${input}`;
    } else {
      config.url = `${prefix}${input}`;
    }
    return config;
  }

  private requestError(rejection: { data: any }) {
    return this.useOrigin(rejection)
      ? Promise.reject(rejection)
      : Promise.reject(rejection.data);
  }

  private response(res: any) {
    return this.isPlainRequest(res.config.url) || this.useOrigin(res)
      ? res
      : res.data;
  }

  private responseError(error: any) {
    if (error.response && error.response.status) {
      let $path;
      let $message;
      let $errorInfo;
      if (error.response.data) {
        const { path, message, data } = error.response.data;
        $path = path;
        $message = message;
        $errorInfo = Array.isArray(data.error)
          ? data.error.join(',')
          : data.error;
      }
      switch (error.response.status) {
        case 400:
          console.log(`错误的请求:${$path}-${$errorInfo}`);
          break;
        // 401: 未登录
        // 未登录则跳转登录页面，并携带当前页面的路径
        // 在登录成功后返回当前页面，这一步需要在登录页操作。
        case 401:
          routers.replace({
            path: '/login',
            query: {
              redirect: routers.currentRoute.fullPath,
            },
          });
          break;

        // 403 token过期
        // 登录过期对用户进行提示
        // 清除本地token和清空vuex中token对象
        // 跳转登录页面
        case 403:
          console.log('登录过期，请重新登录');
          // 清除全部的缓存数据
          window.localStorage.clear();
          // store.commit('loginSuccess', null);
          // 跳转登录页面，并将要浏览的页面fullPath传过去，登录成功后跳转需要访问的页面
          setTimeout(() => {
            routers.replace({
              path: '/login',
              query: {
                redirect: routers.currentRoute.fullPath,
              },
            });
          }, 1000);
          break;

        // 404请求不存在
        case 404:
          console.log('网络请求不存在');
          break;
        // 其他错误，直接抛出错误提示
        default:
          console.log('我也不知道是什么错误');
          break;
      }
    }
    return error.response
      ? Promise.reject(error.response)
      : Promise.reject(error);
  }

  private isHttpUrl(input: string) {
    return /^https?:\/\//.test(input);
  }

  // 判断是不是图片请求
  private isIamUrl(input: string) {
    return /^(sso|iam|iam-.*)\//.test(input);
  }

  private isPlainRequest(input: string) {
    return /\.(html?|xml|txt)$/.test(input);
  }

  private useOrigin(res: any) {
    return res.config.useOrigin;
  }
}

export const axiosRequest = new AxiosRequest();
