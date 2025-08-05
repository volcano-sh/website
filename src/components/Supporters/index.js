import React from 'react';
import SectionContainer from '../SectionContainer';
import './styles.css';

const supporters = [
  {
    imgSrc: "img/supporters/logo_huawei.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.huawei.com"
  },
  {
    imgSrc: "img/supporters/logo_bilibili.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.bilibili.com/"
  },
  {
    imgSrc: "img/supporters/logo_360.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.360.cn/"
  },
  {
    imgSrc: "img/supporters/logo_tencent.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.tencent.com/"
  },
  {
    imgSrc: "img/supporters/logo_baidu.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.baidu.com/"
  },
  {
    imgSrc: "img/supporters/logo_4paradigm.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.4paradigm.com/"
  },
  {
    imgSrc: "img/supporters/logo_iqiyi.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.iqiyi.com/"
  },
  {
    imgSrc: "img/supporters/logo_redbook.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.xiaohongshu.com/"
  },
  {
    imgSrc: "img/supporters/logo_vips.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.vip.com/"
  },
  {
    imgSrc: "img/supporters/logo_didi.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://es.didichuxing.com/"
  },
  {
    imgSrc: "img/supporters/logo_jd.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.jd.com/"
  },
  {
    imgSrc: "img/supporters/logo_bosszhipin.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.zhipin.com/?sid=sem_pz_bdpc_dasou_title"
  },
  {
    imgSrc: "img/supporters/logo_jianxinjinke.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "http://www.ccb.com/cn/home/indexv3.html"
  },
  {
    imgSrc: "img/supporters/logo_qvtoutiao.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.qutoutiao.net/"
  },
  {
    imgSrc: "img/supporters/logo_ruitian.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.ruitiancapital.com/#/"
  },
  {
    imgSrc: "img/supporters/logo_boyun.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.bocloud.com.cn/"
  },
  {
    imgSrc: "img/supporters/logo_zhongkeleinao.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "http://www.leinao.ai/"
  },
  {
    imgSrc: "img/supporters/logo_bibdr.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "http://www.bibdr.org/nd.jsp?id=53"
  },
  {
    imgSrc: "img/supporters/logo_yunzhisheng.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://dev.hivoice.cn/"
  },
  {
    imgSrc: "img/supporters/logo_qiezi.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://shareit.one/"
  },
  {
    imgSrc: "img/supporters/logo_vivo.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.vivo.com.cn/"
  },
  {
    imgSrc: "img/supporters/logo_xiwangzu.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.grandomics.com/"
  },
  {
    imgSrc: "img/supporters/logo_ktnexr.png",
    imgWidth: "100px",
    imgHeight: "60px",  
    url: "https://github.com/nexr/"
  },
  {
    imgSrc: "img/supporters/logo_openinnovation.png",
    imgWidth: "100px",
    imgHeight: "60px",
    url: "https://www.openinnovation.ai/"
  }
];

export default function Supporters() {
  return (
    <div className="supporters-section">
      <SectionContainer>
        <h2 className="supporters-title">Supporters</h2>
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
      </SectionContainer>
    </div>
  );
}
