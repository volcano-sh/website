import React from 'react';
import Container from '../Containers';
import Translate from '@docusaurus/Translate';
import './styles.css';

const supporters = [
  {
    imgSrc: "img/landing/logo_huawei.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.huawei.com"
  },
  {
    imgSrc: "img/landing/logo_bilibili.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.bilibili.com/"
  },
  {
    imgSrc: "img/landing/logo_360.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.360.cn/"
  },
  {
    imgSrc: "img/landing/logo_tencent.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.tencent.com/"
  },
  {
    imgSrc: "img/landing/logo_baidu.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.baidu.com/"
  },
  {
    imgSrc: "img/landing/logo_4paradigm.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.4paradigm.com/"
  },
  {
    imgSrc: "img/landing/logo_iqiyi.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.iqiyi.com/"
  },
  {
    imgSrc: "img/landing/logo_redbook.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.xiaohongshu.com/"
  },
  {
    imgSrc: "img/landing/logo_vips.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.vip.com/"
  },
  {
    imgSrc: "img/landing/logo_didi.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://es.didichuxing.com/"
  },
  {
    imgSrc: "img/landing/logo_jd.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.jd.com/"
  },
  {
    imgSrc: "img/landing/logo_bosszhipin.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.zhipin.com/?sid=sem_pz_bdpc_dasou_title"
  },
  {
    imgSrc: "img/landing/logo_jianxinjinke.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "http://www.ccb.com/cn/home/indexv3.html"
  },
  {
    imgSrc: "img/landing/logo_qvtoutiao.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.qutoutiao.net/"
  },
  {
    imgSrc: "img/landing/logo_ruitian.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.ruitiancapital.com/#/"
  },
  {
    imgSrc: "img/landing/logo_boyun.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.bocloud.com.cn/"
  },
  {
    imgSrc: "img/landing/logo_zhongkeleinao.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.leinao.ai/"
  },
  {
    imgSrc: "img/landing/logo_bibdr.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "http://www.bibdr.org/nd.jsp?id=53"
  },
  {
    imgSrc: "img/landing/logo_yunzhisheng.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://dev.hivoice.cn/"
  },
  {
    imgSrc: "img/landing/logo_qiezi.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.ushareit.com/"
  },
  {
    imgSrc: "img/landing/logo_vivo.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.vivo.com.cn/"
  },
  {
    imgSrc: "img/landing/logo_xiwangzu.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.grandomics.com/"
  },
  {
    imgSrc: "img/landing/logo_ktnexr.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://github.com/nexr/"
  },
  {
    imgSrc: "img/landing/logo_openinnovation.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://openinnovation.ai/"
  },
  {
    imgSrc: "img/landing/logo_iflytek.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.iflytek.com/"
  },
  {
    imgSrc: "img/landing/logo_kingsoftcloud.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.ksyun.com/"
  },
  {
    imgSrc: "img/landing/logo_momenta.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.momenta.cn/"
  },
  {
    imgSrc: "img/landing/logo_infrawaves.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://infrawaves.com/"
  },
  {
    imgSrc: "img/landing/logo_zoom.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.zoom.com/"
  },
  {
    imgSrc: "img/landing/logo_aumovio.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://aumovio.com/"
  },
  {
    imgSrc: "img/landing/logo_feedzai.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.feedzai.com/"
  },
  {
    imgSrc: "img/landing/logo_pinterest.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.pinterest.com/"
  },
  {
    imgSrc: "img/landing/logo_zuoyebang.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://zuoyebang.com/"
  }
];

export default function Supporters() {
  return (
    <div className="supporters-section">
      <Container>
        <h2 className="supporters-title"><Translate>Supporters</Translate></h2>
        <div className="supporters-grid">
          {supporters.map((supporter, index) => (
            <a
              key={index}
              href={supporter.url}
              target="_blank"
              rel="noopener noreferrer"
              className="supporter-link"
            >
              <img
                src={supporter.imgSrc}
                alt="Supporter Logo"
                className="supporter-image"
              />
            </a>
          ))}
        </div>
      </Container>
    </div>
  );
}
