class MoodPeriodTracker {
    constructor() {
        this.supabaseUrl = 'https://rlnnmzsshuobcmfhqvjw.supabase.co';
        this.supabaseKey = 'sb_publishable_0fx2I8rXxUeCIPrkKdjOow_nWqjexgB';
        this.supabase = null;
        this.currentUser = null;
        this.currentMood = null;
        this.currentPeriod = 'none';
        
        this.initSupabase();
        this.initElements();
        this.initEventListeners();
        this.checkAuthState();
    }

    initSupabase() {
        if (this.supabaseUrl && this.supabaseKey) {
            this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
        }
    }

    initElements() {
        // 登录页面元素
        this.loginContainer = document.getElementById('loginContainer');
        this.appContainer = document.getElementById('appContainer');
        this.email = document.getElementById('email');
        this.password = document.getElementById('password');
        this.emailLoginBtn = document.getElementById('emailLoginBtn');
        this.signupBtn = document.getElementById('signupBtn');
        this.forgotBtn = document.getElementById('forgotBtn');
        
        // 用户信息元素
        this.userInfo = document.getElementById('userInfo');
        this.userAvatar = document.getElementById('userAvatar');
        this.userName = document.getElementById('userName');
        this.logoutBtn = document.getElementById('logoutBtn');
        
        // 导航标签
        this.navTabs = document.querySelectorAll('.nav-tab');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // 记录页面元素
        this.recordDate = document.getElementById('recordDate');
        this.moodOptions = document.querySelectorAll('.mood-option');
        this.periodOptions = document.querySelectorAll('input[name="period"]');
        this.notesInput = document.getElementById('notes');
        this.saveRecordBtn = document.getElementById('saveRecord');
        
        // 趋势页面元素
        this.timeRange = document.getElementById('timeRange');
        this.moodChart = document.getElementById('moodChart');
        this.periodChart = document.getElementById('periodChart');
        
        // 分析页面元素
        this.avgMoodPeriod = document.getElementById('avgMoodPeriod');
        this.avgMoodNormal = document.getElementById('avgMoodNormal');
        this.correlationScore = document.getElementById('correlationScore');
        this.correlationChart = document.getElementById('correlationChart');
    }

    initEventListeners() {
        // 登录按钮
        this.emailLoginBtn.addEventListener('click', () => this.loginWithEmail());
        this.signupBtn.addEventListener('click', () => this.signupWithEmail());
        this.forgotBtn.addEventListener('click', () => this.resetPassword());
        
        // 回车键登录
        this.email.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loginWithEmail();
        });
        this.password.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loginWithEmail();
        });
        
        // 退出登录
        this.logoutBtn.addEventListener('click', () => this.logout());

        // 导航标签切换
        this.navTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // 心情选择
        this.moodOptions.forEach(option => {
            option.addEventListener('click', () => this.selectMood(option.dataset.mood));
        });

        // 经期选择
        this.periodOptions.forEach(option => {
            option.addEventListener('change', () => this.selectPeriod(option.value));
        });

        // 保存记录
        this.saveRecordBtn.addEventListener('click', () => this.saveRecord());

        // 日期变化
        this.recordDate.addEventListener('change', () => this.loadRecordForDate());

        // 时间范围变化
        this.timeRange.addEventListener('change', () => this.updateTrends());
    }

    async checkAuthState() {
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (session) {
                this.currentUser = session.user;
                this.showApp();
                this.loadUserProfile();
                this.setTodayDate();
                this.loadTodayRecord();
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('检查认证状态失败:', error);
            this.showLogin();
        }

        // 监听认证状态变化
        this.supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.currentUser = session.user;
                this.showApp();
                this.loadUserProfile();
                this.setTodayDate();
                this.loadTodayRecord();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.showLogin();
            }
        });
    }

    showLogin() {
        this.loginContainer.style.display = 'flex';
        this.appContainer.style.display = 'none';
        // 清空登录表单
        this.email.value = '';
        this.password.value = '';
    }

    showApp() {
        this.loginContainer.style.display = 'none';
        this.appContainer.style.display = 'block';
    }

    async loginWithEmail() {
        const email = this.email.value.trim();
        const password = this.password.value.trim();

        if (!email || !password) {
            alert('请输入邮箱和密码');
            return;
        }

        // 验证邮箱格式
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('请输入正确的邮箱格式');
            return;
        }

        try {
            this.emailLoginBtn.disabled = true;
            this.emailLoginBtn.textContent = '登录中...';

            const { error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw error;
            }

            // 登录成功，认证状态变化会自动处理
        } catch (error) {
            console.error('邮箱登录失败:', error);
            let errorMessage = '登录失败';
            
            if (error.message.includes('Invalid login credentials')) {
                errorMessage = '邮箱或密码错误';
            } else if (error.message.includes('Email not confirmed')) {
                errorMessage = '请先验证邮箱';
            }
            
            alert(errorMessage + ': ' + error.message);
            this.emailLoginBtn.disabled = false;
            this.emailLoginBtn.textContent = '登录';
        }
    }

    async signupWithEmail() {
        const email = this.email.value.trim();
        const password = this.password.value.trim();

        if (!email || !password) {
            alert('请输入邮箱和密码');
            return;
        }

        // 验证邮箱格式
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('请输入正确的邮箱格式');
            return;
        }

        // 验证密码强度
        if (password.length < 6) {
            alert('密码至少需要6位字符');
            return;
        }

        try {
            this.signupBtn.disabled = true;
            this.signupBtn.textContent = '注册中...';

            const { error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        display_name: email.split('@')[0] // 使用邮箱前缀作为显示名
                    }
                }
            });

            if (error) {
                throw error;
            }

            alert('注册成功！请检查邮箱并点击验证链接完成注册。');
            
        } catch (error) {
            console.error('注册失败:', error);
            let errorMessage = '注册失败';
            
            if (error.message.includes('User already registered')) {
                errorMessage = '该邮箱已注册，请直接登录';
            }
            
            alert(errorMessage + ': ' + error.message);
        } finally {
            this.signupBtn.disabled = false;
            this.signupBtn.textContent = '注册新账号';
        }
    }

    async resetPassword() {
        const email = this.email.value.trim();

        if (!email) {
            alert('请先输入邮箱地址');
            return;
        }

        // 验证邮箱格式
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('请输入正确的邮箱格式');
            return;
        }

        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin
            });

            if (error) {
                throw error;
            }

            alert('密码重置邮件已发送，请检查邮箱');
            
        } catch (error) {
            console.error('发送重置邮件失败:', error);
            alert('发送重置邮件失败: ' + error.message);
        }
    }

    async logout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) {
                throw error;
            }
        } catch (error) {
            console.error('退出登录失败:', error);
            alert('退出登录失败: ' + error.message);
        }
    }

    async loadUserProfile() {
        if (!this.currentUser) return;

        try {
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .single();

            if (data && !error) {
                this.userName.textContent = data.display_name || this.currentUser.email || '用户';
                if (data.avatar_url) {
                    this.userAvatar.src = data.avatar_url;
                    this.userAvatar.style.display = 'block';
                } else {
                    this.userAvatar.style.display = 'none';
                }
            } else {
                this.userName.textContent = this.currentUser.email || '用户';
                this.userAvatar.style.display = 'none';
            }
        } catch (error) {
            console.error('加载用户资料失败:', error);
            this.userName.textContent = '用户';
            this.userAvatar.style.display = 'none';
        }
    }

    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        this.recordDate.value = today;
    }

    switchTab(tabName) {
        // 更新导航标签
        this.navTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // 更新标签页内容
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });

        // 加载对应页面数据
        if (tabName === 'trends') {
            this.updateTrends();
        } else if (tabName === 'analysis') {
            this.updateAnalysis();
        }
    }

    selectMood(mood) {
        this.currentMood = parseInt(mood);
        this.moodOptions.forEach(option => {
            option.classList.toggle('selected', option.dataset.mood === mood);
        });
    }

    selectPeriod(period) {
        this.currentPeriod = period;
    }

    async saveRecord() {
        if (!this.currentUser) {
            alert('请先登录');
            return;
        }

        const date = this.recordDate.value;
        const notes = this.notesInput.value.trim();

        if (!date) {
            alert('请选择日期');
            return;
        }

        if (!this.currentMood) {
            alert('请选择心情');
            return;
        }

        try {
            const recordData = {
                user_id: this.currentUser.id,
                record_date: date,
                mood_level: this.currentMood,
                period_status: this.currentPeriod,
                notes: notes,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await this.supabase
                .from('daily_records')
                .upsert(recordData, { onConflict: 'user_id,record_date' })
                .select();

            if (error) {
                throw error;
            }

            alert('记录保存成功！');
            console.log('保存的记录:', data);
        } catch (error) {
            console.error('保存记录失败:', error);
            alert('保存记录失败: ' + error.message);
        }
    }

    async loadRecordForDate() {
        if (!this.currentUser) return;

        const date = this.recordDate.value;
        if (!date) return;

        try {
            const { data, error } = await this.supabase
                .from('daily_records')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('record_date', date)
                .single();

            if (data && !error) {
                // 加载心情
                this.selectMood(data.mood_level.toString());
                
                // 加载经期状态
                this.currentPeriod = data.period_status;
                const periodRadio = document.querySelector(`input[name="period"][value="${data.period_status}"]`);
                if (periodRadio) {
                    periodRadio.checked = true;
                }
                
                // 加载备注
                this.notesInput.value = data.notes || '';
            } else {
                // 清空表单
                this.clearForm();
            }
        } catch (error) {
            console.error('加载记录失败:', error);
            this.clearForm();
        }
    }

    async loadTodayRecord() {
        await this.loadRecordForDate();
    }

    clearForm() {
        this.currentMood = null;
        this.currentPeriod = 'none';
        this.moodOptions.forEach(option => option.classList.remove('selected'));
        document.querySelector('input[name="period"][value="none"]').checked = true;
        this.notesInput.value = '';
    }

    async updateTrends() {
        if (!this.currentUser) return;

        const days = parseInt(this.timeRange.value);
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        try {
            const { data, error } = await this.supabase
                .from('daily_records')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .gte('record_date', startDate.toISOString().split('T')[0])
                .lte('record_date', endDate.toISOString().split('T')[0])
                .order('record_date', { ascending: true });

            if (error) {
                throw error;
            }

            this.renderTrendCharts(data);
        } catch (error) {
            console.error('加载趋势数据失败:', error);
            this.moodChart.innerHTML = '加载数据失败';
            this.periodChart.innerHTML = '加载数据失败';
        }
    }

    renderTrendCharts(data) {
        // 清空现有图表
        this.moodChart.innerHTML = '<canvas id="moodChartCanvas"></canvas>';
        this.periodChart.innerHTML = '<canvas id="periodChartCanvas"></canvas>';

        // 准备心情数据
        const moodData = this.prepareMoodChartData(data);
        this.createMoodChart(moodData);

        // 准备经期数据
        const periodData = this.preparePeriodChartData(data);
        this.createPeriodChart(periodData);
    }

    prepareMoodChartData(data) {
        const labels = [];
        const moodValues = [];
        const backgroundColors = [];
        const borderColors = [];
        
        data.forEach(record => {
            const date = new Date(record.record_date);
            labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
            moodValues.push(record.mood_level);
            
            // 玻璃拟态风格的渐变色彩
            const colors = {
                1: {
                    bg: 'rgba(255, 107, 107, 0.3)', // 很糟糕 - 半透明红色
                    border: 'rgba(255, 107, 107, 0.8)'
                },
                2: {
                    bg: 'rgba(255, 167, 38, 0.3)', // 不太好 - 半透明橙色
                    border: 'rgba(255, 167, 38, 0.8)'
                },
                3: {
                    bg: 'rgba(255, 235, 59, 0.3)', // 一般 - 半透明黄色
                    border: 'rgba(255, 235, 59, 0.8)'
                },
                4: {
                    bg: 'rgba(102, 187, 106, 0.3)', // 不错 - 半透明绿色
                    border: 'rgba(102, 187, 106, 0.8)'
                },
                5: {
                    bg: 'rgba(66, 165, 245, 0.3)', // 很棒 - 半透明蓝色
                    border: 'rgba(66, 165, 245, 0.8)'
                }
            };
            
            const colorSet = colors[record.mood_level] || { bg: 'rgba(204, 204, 204, 0.3)', border: 'rgba(204, 204, 204, 0.8)' };
            backgroundColors.push(colorSet.bg);
            borderColors.push(colorSet.border);
        });

        return { labels, moodValues, backgroundColors, borderColors };
    }

    preparePeriodChartData(data) {
        const periodCounts = { none: 0, light: 0, normal: 0, heavy: 0 };
        
        data.forEach(record => {
            periodCounts[record.period_status]++;
        });

        return {
            labels: ['无', '轻微', '正常', '较重'],
            values: [periodCounts.none, periodCounts.light, periodCounts.normal, periodCounts.heavy],
            colors: [
                'rgba(232, 232, 232, 0.4)', // 无 - 半透明灰色
                'rgba(255, 179, 186, 0.4)', // 轻微 - 半透明浅粉色
                'rgba(255, 123, 123, 0.4)', // 正常 - 半透明粉色
                'rgba(255, 71, 87, 0.4)'    // 较重 - 半透明深粉色
            ],
            borderColors: [
                'rgba(232, 232, 232, 0.8)',
                'rgba(255, 179, 186, 0.8)',
                'rgba(255, 123, 123, 0.8)',
                'rgba(255, 71, 87, 0.8)'
            ]
        };
    }

    createMoodChart(data) {
        const ctx = document.getElementById('moodChartCanvas').getContext('2d');
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: '心情等级',
                    data: data.moodValues,
                    backgroundColor: data.backgroundColors,
                    borderColor: data.borderColors,
                    borderWidth: 2,
                    borderRadius: 12,
                    borderSkipped: false,
                    // 添加阴影效果
                    shadowOffsetX: 0,
                    shadowOffsetY: 4,
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const moodTexts = {
                                    1: '很糟糕',
                                    2: '不太好', 
                                    3: '一般',
                                    4: '不错',
                                    5: '很棒'
                                };
                                return `心情: ${moodTexts[context.parsed.y]} (${context.parsed.y}/5)`;
                            }
                        },
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: 'rgba(214, 51, 132, 0.3)',
                        borderWidth: 1,
                        cornerRadius: 12,
                        displayColors: false,
                        padding: 12,
                        titleFont: {
                            size: 14,
                            weight: '600'
                        },
                        bodyFont: {
                            size: 13
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5,
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                const moodTexts = {
                                    1: '😢',
                                    2: '😕',
                                    3: '😐',
                                    4: '😊',
                                    5: '😄'
                                };
                                return moodTexts[value] || value;
                            },
                            color: '#666',
                            font: {
                                size: 16
                            }
                        },
                        grid: {
                            color: 'rgba(214, 51, 132, 0.08)',
                            lineWidth: 1
                        },
                        border: {
                            display: false
                        }
                    },
                    x: {
                        ticks: {
                            color: '#666',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        },
                        grid: {
                            display: false
                        },
                        border: {
                            display: false
                        }
                    }
                },
                animation: {
                    duration: 1200,
                    easing: 'easeOutQuart'
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    createPeriodChart(data) {
        const ctx = document.getElementById('periodChartCanvas').getContext('2d');
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: data.colors,
                    borderColor: data.borderColors,
                    borderWidth: 2,
                    hoverOffset: 15,
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 25,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                                size: 14,
                                weight: '500'
                            },
                            color: '#666',
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        return {
                                            text: `${label} (${value})`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            strokeStyle: data.datasets[0].borderColor[i],
                                            lineWidth: 2,
                                            pointStyle: 'circle',
                                            hidden: false,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.parsed * 100) / total).toFixed(1) : '0.0';
                                return `${context.label}: ${context.parsed} 天 (${percentage}%)`;
                            }
                        },
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: 'rgba(214, 51, 132, 0.3)',
                        borderWidth: 1,
                        cornerRadius: 12,
                        displayColors: true,
                        padding: 12,
                        titleFont: {
                            size: 14,
                            weight: '600'
                        },
                        bodyFont: {
                            size: 13
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1200,
                    easing: 'easeOutQuart'
                },
                interaction: {
                    intersect: false
                }
            }
        });
    }

    async updateAnalysis() {
        if (!this.currentUser) return;

        try {
            const { data, error } = await this.supabase
                .from('daily_records')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('record_date', { ascending: false })
                .limit(90); // 最近90天

            if (error) {
                throw error;
            }

            this.calculateCorrelation(data);
        } catch (error) {
            console.error('加载分析数据失败:', error);
        }
    }

    calculateCorrelation(data) {
        const periodRecords = data.filter(record => record.period_status !== 'none');
        const normalRecords = data.filter(record => record.period_status === 'none');

        if (periodRecords.length === 0) {
            this.avgMoodPeriod.textContent = '-';
            this.avgMoodNormal.textContent = normalRecords.length > 0 ? 
                (normalRecords.reduce((sum, r) => sum + r.mood_level, 0) / normalRecords.length).toFixed(1) : '-';
            this.correlationScore.textContent = '-';
            this.correlationChart.innerHTML = '<p style="color: #999; text-align: center;">暂无足够数据进行关联分析</p>';
            return;
        }

        const avgMoodPeriod = periodRecords.reduce((sum, r) => sum + r.mood_level, 0) / periodRecords.length;
        const avgMoodNormal = normalRecords.length > 0 ? 
            normalRecords.reduce((sum, r) => sum + r.mood_level, 0) / normalRecords.length : 0;

        this.avgMoodPeriod.textContent = avgMoodPeriod.toFixed(1);
        this.avgMoodNormal.textContent = avgMoodNormal.toFixed(1);

        // 简单的关联度计算
        const difference = Math.abs(avgMoodPeriod - avgMoodNormal);
        const correlationScore = Math.min(difference * 20, 100); // 转换为百分比

        this.correlationScore.textContent = correlationScore.toFixed(0) + '%';

        // 创建对比图表
        this.createCorrelationChart(avgMoodPeriod, avgMoodNormal, periodRecords.length, normalRecords.length);
    }

    createCorrelationChart(avgMoodPeriod, avgMoodNormal, periodDays, normalDays) {
        this.correlationChart.innerHTML = '<canvas id="correlationChartCanvas"></canvas>';
        
        const ctx = document.getElementById('correlationChartCanvas').getContext('2d');
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['经期期间', '非经期期间'],
                datasets: [{
                    label: '平均心情',
                    data: [avgMoodPeriod, avgMoodNormal],
                    backgroundColor: [
                        'rgba(255, 154, 158, 0.4)',
                        'rgba(102, 187, 106, 0.4)'
                    ],
                    borderColor: [
                        'rgba(255, 154, 158, 0.8)',
                        'rgba(102, 187, 106, 0.8)'
                    ],
                    borderWidth: 2,
                    borderRadius: 12,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const days = context.dataIndex === 0 ? periodDays : normalDays;
                                return `平均心情: ${context.parsed.y.toFixed(1)}/5 (${days} 天数据)`;
                            }
                        },
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: 'rgba(214, 51, 132, 0.3)',
                        borderWidth: 1,
                        cornerRadius: 12,
                        displayColors: false,
                        padding: 12,
                        titleFont: {
                            size: 14,
                            weight: '600'
                        },
                        bodyFont: {
                            size: 13
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5,
                        ticks: {
                            stepSize: 0.5,
                            callback: function(value) {
                                return value.toFixed(1);
                            },
                            color: '#666',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        },
                        grid: {
                            color: 'rgba(214, 51, 132, 0.08)',
                            lineWidth: 1
                        },
                        border: {
                            display: false
                        }
                    },
                    x: {
                        ticks: {
                            color: '#666',
                            font: {
                                size: 13,
                                weight: '500'
                            }
                        },
                        grid: {
                            display: false
                        },
                        border: {
                            display: false
                        }
                    }
                },
                animation: {
                    duration: 1200,
                    easing: 'easeOutQuart'
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    getMoodText(mood) {
        const moodTexts = {
            1: '很糟糕',
            2: '不太好',
            3: '一般',
            4: '不错',
            5: '很棒'
        };
        return moodTexts[mood] || '未知';
    }

    getPeriodText(period) {
        const periodTexts = {
            'none': '无',
            'light': '轻微',
            'normal': '正常',
            'heavy': '较重'
        };
        return periodTexts[period] || '未知';
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new MoodPeriodTracker();
});