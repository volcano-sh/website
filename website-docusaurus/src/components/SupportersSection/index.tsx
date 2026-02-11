import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const SUPPORTERS = [
  {img: 'logo_huawei.png', url: 'https://www.huawei.com'},
  {img: 'logo_bilibili.png', url: 'https://www.bilibili.com/'},
  {img: 'logo_360.png', url: 'https://www.360.cn/'},
  {img: 'logo_tencent.png', url: 'https://www.tencent.com/'},
  {img: 'logo_baidu.png', url: 'https://www.baidu.com/'},
  {img: 'logo_4paradigm.png', url: 'https://www.4paradigm.com/'},
  {img: 'logo_iqiyi.png', url: 'https://www.iqiyi.com/'},
  {img: 'logo_redbook.png', url: 'https://www.xiaohongshu.com/'},
  {img: 'logo_vips.png', url: 'https://www.vip.com/'},
  {img: 'logo_didi.png', url: 'https://es.didichuxing.com/'},
  {img: 'logo_jd.png', url: 'https://www.jd.com/'},
  {img: 'logo_bosszhipin.png', url: 'https://www.zhipin.com/'},
  {img: 'logo_jianxinjinke.png', url: 'http://www.ccb.com/cn/home/indexv3.html'},
  {img: 'logo_qvtoutiao.png', url: 'https://www.qutoutiao.net/'},
  {img: 'logo_ruitian.png', url: 'https://www.ruitiancapital.com/'},
  {img: 'logo_boyun.png', url: 'https://www.bocloud.com.cn/'},
  {img: 'logo_zhongkeleinao.png', url: 'http://www.leinao.ai/'},
  {img: 'logo_bibdr.png', url: 'http://www.bibdr.org/nd.jsp?id=53'},
  {img: 'logo_yunzhisheng.png', url: 'https://dev.hivoice.cn/'},
  {img: 'logo_qiezi.png', url: 'https://shareit.one/'},
  {img: 'logo_vivo.png', url: 'https://www.vivo.com.cn/'},
  {img: 'logo_xiwangzu.png', url: 'https://www.grandomics.com/'},
  {img: 'logo_ktnexr.png', url: 'https://github.com/nexr/'},
  {img: 'logo_openinnovation.png', url: 'https://www.openinnovation.ai/'},
];

export default function SupportersSection(): JSX.Element {
  return (
    <section id="supporters" className={styles.section}>
      <div className="container">
        <h2 className={styles.title}>Supporters</h2>
        <div className={styles.grid}>
          {SUPPORTERS.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className={styles.logoWrap}>
              <img src={useBaseUrl(`/img/${s.img}`)} alt="Supporter" className={styles.logo} onError={(e) => {(e.target as HTMLImageElement).style.display = 'none'}} />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
