+++
title = "社区会员"


date = 2019-01-28
lastmod = 2020-09-06

draft = false  # Is this a draft? true/false
toc = true  # Show table of contents? true/false
type = "docs"  # Do not modify.

# Add menu entry to sidebar.
linktitle = "社区会员"
[menu.docs]
  parent = "contribution"
  weight = 2
+++

## Volcano社区成员

**请注意：** 本文档根据Volcano社区反馈持续更新

本文档将对Volcano社区成员各角色的要求和职责做简要说明

| 角色 | 要求 | 职责 | 权利 |
| -----| ---------------- | ------------ | -------|
| [Member](#member) | 至少由2名approver通过, 在Volcano社区保持活跃并有所贡献 | 欢迎和指导新加入者 | Volcano社区组织成员 |
| [Approver](#approver) | 至少由2名maintainers通过, 在某个领域具有较深的贡献和研究, 在Volcano社区编码和代码检视方面做出贡献  | 对社区贡献者提交的代码进行检视和合入 | 对相关仓库的指定包具有编辑权限 |
| [Maintainer](#maintainer) | 至少由2名owners通过, 对特性设计、开发和代码检视具有良好的技术判断力 | 参与版本规划和特性开发、维护 | 对相关仓库具有定级编辑权限。昵称列入仓库Maintainers文件中 |
| [Owner](#owner) | 至少由3名owners通过，主持Volcano项目的各方面工作 | 主持项目的宏观技术路标，为版本计划设置活动优先级 | Volcano社区组织管理员权限 |

**请注意：** 全体Volcano成员均强制要求遵循[代码管理规范](https://github.com/volcano-sh/website/blob/master/CODE_OF_CONDUCT.md) 。

### Member

成员是社区中的积极参与者，他们通过编写PRs、审阅Issues/PRs或通过社区邮件列表/Slack/例会参与社区讨论。


#### 要求

- 至少由2名approvers通过
- Github账户通过双因子认证
- 社区贡献活跃. 贡献包括但不限于:
    - 提交PRs
    - 审阅由其他社区成员提出的 issues/PRs
    - 通过slack、邮件列表参与社区讨论
    - 参与社区例会

#### 职责和权利

- Volcano Github组织成员
- 能够被分配issues和PRs，其他社区成员也能够申请由他们进行内容检视
- 参与分配Issues和PRs
- 欢迎新的贡献者
- 指导新的贡献者进行相关文档和文件的更新
- 发展新的Volcano社区贡献者


### Approver

Approvers是指在某个领域具有较好的基础或较深入研究的活跃的Member。
他们持续的参与issue/PR的检视工作，并能在检视过程中进行问题界定和意见指导。


#### 要求

- 至少由2名maintainers通过
- 至少具有2个月的Member角色工作经历
- 检视了一定数量的PRs
- 具有良好的代码功底


#### 职责和权利

- 检视代码，保证和维护社区代码质量
- 确认并处理社区成员的审查请求
- 检视和批准某个领域的相关代码合入
- 对仓库中的指定包具有编辑权限，通过机器人强制执行
- 持续为社区代码做出贡献，指导其他社区成员为社区做出贡献

### Maintainer

Maintainer是指在特性设计、开发方便展现出良好技术判断力的approver。他们对项目和特性具有较为宏观的把控能力。
Maintainers are approvers who have shown good technical judgement in feature design/development in the past.
Has overall knowledge of the project and features in the project.

#### 要求

- 至少2名owners通过
- 至少具有2个月Approver的工作经历
- 由1名项目owner指定
- 在特性设计、开发方面具有良好的技术判断力

#### 职责和权利

- 参与社区版本规划
- 管控项目代码质量
- 确保API与基于功能分级标准的向前/向后版本兼容
- 展现出良好的技术判断力
- 分析和提出项目新的特性和优化点
- 指导社区贡献者和approver
- 对相关仓库具有顶级编辑权限（有需要时可以手动合入PR）
- 昵称列入仓库的Maintainers文件
- 参与和驱动多个特性的设计和开发

### Owner

Owners是指协助管控项目宏观方向的maintainer。他们需要对Volcano和相关领域有深入了解，有助于在发布计划等重大方面达成一致。

#### 要求

- 至少由3名owner通过
- 具有至少2个月Maintainer工作经历
- 由1名项目owner指定
- 不能被任何项目owner反对
- 在把控项目宏观发展方面做出贡献

#### 职责和权利

- 在项目的宏观方面做出决策
- 制定项目的宏观发展路标
- 为版本计划设置活动优先级
- 指导其他社区成员
- 确保所有社区成员遵循代码管理规范
- 虽然被给与了所有仓库的管理员权限，仍需要确保所有的PR被正确的检视和合入
- 根据需要获取其他相关仓库的管理员权限
- 参与和推动多个特性的设计和开发


**请注意** 这些角色仅适用于Volcano github组织和仓库。当前Volcano还没有正式的角色检视和接收流程。我们将尽快制定该流程.
